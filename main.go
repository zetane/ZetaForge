package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"server/zjson"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/invopop/jsonschema"
	"github.com/xeipuuv/gojsonschema"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"

	"github.com/mixpanel/mixpanel-go"
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
	log.Printf("%+v", pipeline)

	cfg, ok := ctx.Get("cfg")

	if !ok {
		log.Printf("Config is missing")
		ctx.String(http.StatusInternalServerError, "Config is missing")
		return
	}
	config := cfg.(Config)

	client, ok := ctx.Get("client")

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
		panic(err)
	}

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

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		// Handle OPTIONS requests for CORS preflight
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusOK)
			return
		}

		c.Next()
	})

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
