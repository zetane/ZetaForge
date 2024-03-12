package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"embed"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"

	"server/zjson"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/invopop/jsonschema"
	_ "github.com/mattn/go-sqlite3"
	"github.com/pressly/goose/v3"
	"github.com/xeipuuv/gojsonschema"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"

	"github.com/mixpanel/mixpanel-go"
)

//go:embed db/migrations/*.sql
var migrations embed.FS

type Config struct {
	IsLocal         bool
	ServerPort      string
	KanikoImage     string
	WorkDir         string
	FileDir         string
	ComputationFile string
	EntrypointFile  string
	ServiceAccount  string
	Bucket          string
	Database        string
	Local           Local `json:"Local,omitempty"`
	Cloud           Cloud `json:"Cloud,omitempty"`
}

type Local struct {
	BucketPort   string
	RegistryPort string
}

type Cloud struct {
	Registry     string
	RegistryAddr string
	RegistryUser string
	RegistryPass string
	ClusterIP    string
	Token        string
	CaCert       string
}

// UTILITY FUNCTIONS FOR GENERATING DISTINCT ID FOR MIXPANEL
func macAddressToDecimal(mac string) (*big.Int, error) {
	macWithoutColons := strings.ReplaceAll(mac, ":", "")

	macBytes, err := hex.DecodeString(macWithoutColons)
	if err != nil {
		return nil, err
	}

	// Convert the byte slice to a BigInt
	macAsBigInt := new(big.Int).SetBytes(macBytes)

	return macAsBigInt, nil

}

func getMACAddress() (string, *big.Int, error) {

	// return value: big Int, which is MAC address of the device. In the case of Failure, we return zero, as big Int.

	interfaces, err := net.Interfaces()
	if err != nil {
		return "", nil, err
	}

	// Find the first non-loopback interface with a hardware address
	for _, iface := range interfaces {
		if iface.Flags&net.FlagLoopback == 0 && len(iface.HardwareAddr) > 0 {
			macAddress := iface.HardwareAddr.String()
			macInt, err := macAddressToDecimal(macAddress)
			if err != nil {
				return "", nil, err
			}
			return macAddress, macInt, nil
		}
	}

	return "", new(big.Int).SetInt64(int64(0)), fmt.Errorf("unable to determine distinct_id, using default distinct_id")
}

func validateJson(ctx context.Context, body io.ReadCloser) (zjson.Pipeline, HTTPError) {
	schema, err := json.Marshal(jsonschema.Reflect(&zjson.Pipeline{}))

	if err != nil { // Should never happen outside of development
		return zjson.Pipeline{}, InternalServerError{err.Error()}
	}

	buffer := new(bytes.Buffer)
	buffer.ReadFrom(body)

	schemaLoader := gojsonschema.NewStringLoader(string(schema))
	jsonLoader := gojsonschema.NewStringLoader(buffer.String())
	result, err := gojsonschema.Validate(schemaLoader, jsonLoader)

	if err != nil {
		return zjson.Pipeline{}, InternalServerError{err.Error()}
	}

	if !result.Valid() {
		var listError []string
		for _, error := range result.Errors() {
			listError = append(listError, error.String())
		}
		stringError := strings.Join(listError, "\n")
		return zjson.Pipeline{}, BadRequest{stringError}
	}

	var pipeline zjson.Pipeline
	if err := json.Unmarshal(buffer.Bytes(), &pipeline); err != nil {
		return zjson.Pipeline{}, InternalServerError{err.Error()}
	}
	log.Printf("%+v", pipeline)

	//Get Mac address as a big integer, then hash it with sha256. Note that, this might give a different result if we run s2 from the cloud
	_, macInt, err := getMACAddress()

	macAsString := macInt.String()
	hash := sha256.New()
	hash.Write([]byte(macAsString))
	hashedResult := hash.Sum(nil)
	distinctID := hex.EncodeToString(hashedResult)

	mp := mixpanel.NewApiClient("4c09914a48f08de1dbe3dc4dd2dcf90d")
	if err := mp.Track(ctx, []*mixpanel.Event{
		mp.NewEvent("Run Created", distinctID, map[string]interface{}{
			"distinct_id": distinctID,
		}),
	}); err != nil {
		log.Printf("Mixpanel error; err=%v", err)
	}
	return pipeline, nil
}

func main() {
	file, err := os.ReadFile("config.json")
	if err != nil {
		log.Fatalf("Config file missing; err=%v", err)
		return
	}
	var config Config
	if err := json.Unmarshal(file, &config); err != nil {
		log.Fatalf("Config file invalid; err=%v", err)
		return
	}

	db, err := sql.Open("sqlite3", config.Database)
	if err != nil {
		log.Fatalf("Failed to load database; err=%v", err)
	}

	goose.SetBaseFS(migrations)

	if err := goose.SetDialect(string(goose.DialectSQLite3)); err != nil {
		log.Fatalf("Failed to set database dialect; err=%v", err)
	}

	if err := goose.Up(db, "db/migrations"); err != nil {
		log.Fatalf("Failed to migrate database; err=%v", err)
	}

	var client clientcmd.ClientConfig
	if config.IsLocal {
		client = clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
			clientcmd.NewDefaultClientConfigLoadingRules(),
			&clientcmd.ConfigOverrides{},
		)
	} else {
		cacert, err := base64.StdEncoding.DecodeString(config.Cloud.CaCert)
		if err != nil {
			log.Fatalf("Invalid CA certificate; err=%v", err)
		}

		cfg := clientcmdapi.NewConfig()
		cfg.Clusters["zetacluster"] = &clientcmdapi.Cluster{
			Server:                   "https://" + config.Cloud.ClusterIP,
			CertificateAuthorityData: cacert,
		}
		cfg.AuthInfos["zetaauth"] = &clientcmdapi.AuthInfo{
			Token: config.Cloud.Token,
		}
		cfg.Contexts["zetacontext"] = &clientcmdapi.Context{
			Cluster:  "zetacluster",
			AuthInfo: "zetaauth",
		}
		cfg.CurrentContext = "zetacontext"

		client = clientcmd.NewDefaultClientConfig(*cfg, &clientcmd.ConfigOverrides{})
	}

	hub := newHub()
	go hub.Run()

	router := gin.Default()
	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, PATCH, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		// Handle OPTIONS requests for CORS preflight
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusOK)
			return
		}

		c.Next()
	})
	router.POST("/execute", func(ctx *gin.Context) {
		pipeline, err := validateJson(ctx.Request.Context(), ctx.Request.Body)
		if err != nil {
			log.Printf("Invalid json request; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		res, err := createPipeline(ctx.Request.Context(), db, "org", pipeline)
		if err != nil {
			log.Printf("Failed to create pipeline; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		if config.IsLocal {
			go localExecute(&pipeline, res.ID, config, client, db, hub)
		} else {
			go cloudExecute(&pipeline, res.ID, config, client, db, hub)
		}
	})
	router.GET("/ws/:room", func(ctx *gin.Context) {
		room := ctx.Param("room")
		upgrader := websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		}

		conn, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
		if err != nil {
			ctx.String(http.StatusInternalServerError, err.Error())
			return
		}

		if err := serveSocket(conn, room, hub); err != nil {
			log.Printf("Websocket error; err=%v", err)
			ctx.String(err.Status(), err.Error())
		}
	})

	pipeline := router.Group("/pipeline")
	pipeline.POST("", func(ctx *gin.Context) {
		pipeline, err := validateJson(ctx.Request.Context(), ctx.Request.Body)
		if err != nil {
			log.Printf("Invalid json request; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		res, err := createPipeline(ctx.Request.Context(), db, "org", pipeline)
		if err != nil {
			log.Printf("Failed to create pipeline; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		ctx.JSON(http.StatusCreated, newResponsePipeline(res))
	})
	pipeline.GET("/list", func(ctx *gin.Context) {
		res, err := listAllPipelines(ctx.Request.Context(), db, "org")

		if err != nil {
			log.Printf("Failed to list pipelines; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		var response []ResponsePipeline
		for _, pipeline := range res {
			response = append(response, newResponsePipeline(pipeline))
		}

		ctx.JSON(http.StatusOK, response)
	})
	pipeline.DELETE("/:uuid/:hash", func(ctx *gin.Context) {
		uuid := ctx.Param("uuid")
		hash := ctx.Param("hash")

		if err := softDeletePipeline(ctx.Request.Context(), db, "org", uuid, hash); err != nil {
			log.Printf("Failed to delete pipeline; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}
	})
	pipeline.PATCH("/:uuid/:hash/deploy", func(ctx *gin.Context) {
		uuid := ctx.Param("uuid")
		hash := ctx.Param("hash")

		if err := deployPipeline(ctx.Request.Context(), db, "org", uuid, hash); err != nil {
			log.Printf("Failed to deploy pipeline; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}
	})
	pipeline.GET("/:uuid/list", func(ctx *gin.Context) {
		uuid := ctx.Param("uuid")

		res, err := listAllExecutions(ctx.Request.Context(), db, "org", uuid)

		if err != nil {
			log.Printf("Failed to list executions; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		var response []ResponseExecution
		for _, execution := range res {
			response = append(response, newResponseExecutionRow(execution))
		}

		ctx.JSON(http.StatusOK, response)
	})
	pipeline.GET("/:uuid/:hash/:index", func(ctx *gin.Context) {
		uuid := ctx.Param("uuid")
		hash := ctx.Param("hash")
		index, err := strconv.Atoi(ctx.Param("index"))
		if err != nil {
			ctx.String(http.StatusBadRequest, "Invalid index")
			return
		}

		res, httpErr := getExecution(ctx.Request.Context(), db, "org", uuid, hash, index)
		if httpErr != nil {
			log.Printf("Failed to delete execution; err=%v", err)
			ctx.String(httpErr.Status(), httpErr.Error())
			return
		}

		ctx.JSON(http.StatusOK, newResponseExecution(res, hash))
	})
	pipeline.GET("/:uuid/:hash/list", func(ctx *gin.Context) {
		uuid := ctx.Param("uuid")
		hash := ctx.Param("hash")

		res, err := listExecutions(ctx.Request.Context(), db, "org", uuid, hash)

		if err != nil {
			log.Printf("Failed to list executions; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		var response []ResponseExecution
		for _, execution := range res {
			response = append(response, newResponseExecution(execution, hash))
		}

		ctx.JSON(http.StatusOK, response)
	})
	pipeline.POST("/:uuid/:hash/execute", func(ctx *gin.Context) {
		uuid := ctx.Param("uuid")
		hash := ctx.Param("hash")
		res, err := getPipeline(ctx.Request.Context(), db, "org", uuid, hash)
		if err != nil {
			log.Printf("Failed to execute pipeline; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		var pipeline zjson.Pipeline
		if err := json.Unmarshal([]byte(res.Json), &pipeline); err != nil {
			ctx.String(http.StatusInternalServerError, err.Error())
			return
		}

		if config.IsLocal {
			go localExecute(&pipeline, res.ID, config, client, db, hub)
		} else {
			go cloudExecute(&pipeline, res.ID, config, client, db, hub)
		}
	})
	pipeline.DELETE("/:uuid/:hash/:index", func(ctx *gin.Context) {
		uuid := ctx.Param("uuid")
		hash := ctx.Param("hash")
		index, err := strconv.Atoi(ctx.Param("index"))
		if err != nil {
			ctx.String(http.StatusBadRequest, "Invalid index")
			return
		}

		if err := softDeleteExecution(ctx.Request.Context(), db, "org", uuid, hash, index); err != nil {
			log.Printf("Failed to delete execution; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}
	})

	router.Run(":" + config.ServerPort)
}
