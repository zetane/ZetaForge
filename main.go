package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"server/zjson"

	"github.com/gin-gonic/gin"
	"github.com/invopop/jsonschema"
	"github.com/xeipuuv/gojsonschema"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

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

func loadConfig(cfg Config) gin.HandlerFunc {
	if cfg.IsLocal {
		client := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
			clientcmd.NewDefaultClientConfigLoadingRules(),
			&clientcmd.ConfigOverrides{},
		)

		return func(ctx *gin.Context) {
			ctx.Set("cfg", cfg)
			ctx.Set("client", client)
			ctx.Next()
		}
	} else {
		cacert, err := base64.StdEncoding.DecodeString(cfg.Cloud.CaCert)
		if err != nil {
			log.Fatalf("Invalid CA certificate; err=%v", err)
		}

		config := clientcmdapi.NewConfig()
		config.Clusters["zetacluster"] = &clientcmdapi.Cluster{
			Server:                   "https://" + cfg.Cloud.ClusterIP,
			CertificateAuthorityData: cacert,
		}
		config.AuthInfos["zetaauth"] = &clientcmdapi.AuthInfo{
			Token: cfg.Cloud.Token,
		}
		config.Contexts["zetacontext"] = &clientcmdapi.Context{
			Cluster:  "zetacluster",
			AuthInfo: "zetaauth",
		}
		config.CurrentContext = "zetacontext"

		client := clientcmd.NewDefaultClientConfig(*config, &clientcmd.ConfigOverrides{})
		return func(ctx *gin.Context) {
			ctx.Set("cfg", cfg)
			ctx.Set("client", client)
			ctx.Next()
		}
	}
}

func run(ctx *gin.Context, hub *Hub) {
	schema, err := json.Marshal(jsonschema.Reflect(&zjson.Pipeline{}))

	if err != nil { // Should never happen outside of development
		log.Printf("Invalid json schema; err=%v", err)
		ctx.String(http.StatusInternalServerError, err.Error())
		return
	}

	buffer := new(bytes.Buffer)
	buffer.ReadFrom(ctx.Request.Body)

	schemaLoader := gojsonschema.NewStringLoader(string(schema))
	jsonLoader := gojsonschema.NewStringLoader(buffer.String())
	result, err := gojsonschema.Validate(schemaLoader, jsonLoader)

	if err != nil {
		log.Printf("Failed to validate the json; err=%v", err)
		ctx.String(http.StatusInternalServerError, err.Error())
		return
	}

	if !result.Valid() {
		var errorList []string
		for _, error := range result.Errors() {
			errorList = append(errorList, error.String())
		}
		errorString := strings.Join(errorList, "\n")
		log.Printf("Invalid json format; err=%s", errorString)
		ctx.String(http.StatusBadRequest, errorString)
		return
	}

	var pipeline zjson.Pipeline
	if err := json.Unmarshal(buffer.Bytes(), &pipeline); err != nil {
		log.Printf("Json parsing error; err=%v", err)
		ctx.String(http.StatusInternalServerError, err.Error())
		return
	}

	cfg, ok := ctx.Get("cfg")

	if !ok {
		log.Printf("Config is missing")
		ctx.String(http.StatusInternalServerError, "Config is missing")
		return
	}
	config := cfg.(Config)

	client, ok := ctx.Get("client")

	if !ok {
		log.Printf("Client is missing")
		ctx.String(http.StatusInternalServerError, "Client is missing")
		return
	}

	if config.IsLocal {
		go localExecute(&pipeline, config, client.(clientcmd.ClientConfig), hub)
	} else {
		go cloudExecute(&pipeline, config, client.(clientcmd.ClientConfig), hub)
	}
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

	hub := newHub()
	go hub.Run()

	router := gin.Default()
	router.Use(loadConfig(config))
	router.POST("/run", func(ctx *gin.Context) {
		run(ctx, hub)
	})
	router.GET("/ws/:roomId", func(ctx *gin.Context) {
		roomId := ctx.Param("roomId")
		if err := serveSocket(ctx, roomId, hub); err != nil {
			log.Printf("Websocket error; err=%v", err)
			ctx.String(http.StatusInternalServerError, err.Error())
		}
	})

	router.Run(":" + config.ServerPort)
}
