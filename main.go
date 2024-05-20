package main

import (
	"bytes"
	"context"
	"database/sql"
	"embed"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"fmt"
	"server/zjson"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/invopop/jsonschema"
	_ "github.com/mattn/go-sqlite3"
	"github.com/pressly/goose/v3"
	"github.com/xeipuuv/gojsonschema"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"

	"github.com/getsentry/sentry-go"
	sentrygin "github.com/getsentry/sentry-go/gin"
)

//go:embed db/migrations/*.sql
var migrations embed.FS

type Config struct {
	IsLocal         bool
	IsDev           bool
	ServerPort      int
	KanikoImage     string
	WorkDir         string
	FileDir         string
	ComputationFile string
	EntrypointFile  string
	ServiceAccount  string
	Bucket          string
	Database        string
	SetupVersion    string
	Local           Local `json:"Local,omitempty"`
	Cloud           Cloud `json:"Cloud,omitempty"`
}

type Local struct {
	BucketPort int
	Driver     string
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

type WebSocketWriter struct {
	PipelineId  string
	MessageFunc func(string, string)
	// Add other fields as needed
}

func (w *WebSocketWriter) Write(p []byte) (n int, err error) {
	message := string(p)
	w.MessageFunc(message, w.PipelineId)
	return len(p), nil
}

func createLogger(pipelineId string, file io.Writer, messageFunc func(string, string)) io.Writer {
	wsWriter := &WebSocketWriter{
		PipelineId:  pipelineId,
		MessageFunc: messageFunc,
	}

	return io.MultiWriter(os.Stdout, wsWriter, file)
}

func validateJson[D any](body io.ReadCloser) (D, HTTPError) {
	var data D
	schema, err := json.Marshal(jsonschema.Reflect(data))

	if err != nil { // Should never happen outside of development
		return data, InternalServerError{err.Error()}
	}

	buffer := new(bytes.Buffer)
	buffer.ReadFrom(body)

	schemaLoader := gojsonschema.NewStringLoader(string(schema))
	jsonLoader := gojsonschema.NewStringLoader(buffer.String())
	result, err := gojsonschema.Validate(schemaLoader, jsonLoader)

	if err != nil {
		return data, InternalServerError{err.Error()}
	}

	if !result.Valid() {
		var listError []string
		for _, error := range result.Errors() {
			listError = append(listError, error.String())
		}
		stringError := strings.Join(listError, "\n")
		return data, BadRequest{stringError}
	}

	if err := json.Unmarshal(buffer.Bytes(), &data); err != nil {
		return data, InternalServerError{err.Error()}
	}

	return data, nil
}

func setupSentry() {
	err := sentry.Init(sentry.ClientOptions{
		Dsn: "https://7fb18e8e487455a950298625457264f3@o1096443.ingest.us.sentry.io/4507031960223744",
	})
	if err != nil {
		log.Fatalf("Failed to start Sentry; err=%s", err)
	}
	defer sentry.Flush(2 * time.Second)
}

func main() {
	ctx := context.Background()
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

	//Initialize mixpanelClient only once(it's singleton)
	mixpanelClient = InitMixpanelClient(ctx, "4c09914a48f08de1dbe3dc4dd2dcf90d", config)
	setupSentry()

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

		// Switching to Cobra if we need more arguments
		if len(os.Args) > 1 {
			if os.Args[1] == "--uninstall" {
				uninstall(ctx, client, db)
				return
			}
			os.Exit(1)
		}
		setup(ctx, config, client, db)
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

	router.Use(sentrygin.New(sentrygin.Options{}))

	router.POST("/execute", func(ctx *gin.Context) {
		execution, err := validateJson[zjson.Execution](ctx.Request.Body)
		if err != nil {
			log.Printf("Invalid json request; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		res, err := createPipeline(ctx.Request.Context(), db, "org", execution.Pipeline)
		if err != nil {
			log.Printf("Failed to create pipeline; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		// TODO: client needs to handle results files
		sink := filepath.Join(execution.Pipeline.Sink, "history", execution.Id)
		execution.Pipeline.Sink = sink
		if config.IsLocal {
			go localExecute(&execution.Pipeline, res.ID, execution.Id, execution.Build, config, client, db, hub)
		} else {
			go cloudExecute(&execution.Pipeline, res.ID, execution.Id, execution.Build, config, client, db, hub)
		}
		newRes := make(map[string]any)
		newRes["executionId"] = execution.Id
		newRes["history"] = sink
		newRes["pipeline"] = res
		ctx.JSON(http.StatusCreated, newRes)
	})
	router.GET("/rooms", func(ctx *gin.Context) {
		rooms := hub.GetRooms()
		ctx.JSON(http.StatusOK, rooms)
	})
	router.GET("/ws/:room", func(ctx *gin.Context) {
		room := ctx.Param("room")
		upgrader := websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				// Allow specific origin
				origin := r.Header.Get("Origin")
				return strings.HasPrefix(origin, "http://localhost") || strings.HasPrefix(origin, "http://127.0.0.1") || strings.HasPrefix(origin, "file://")
			},

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
	execution := router.Group("/execution")
	execution.GET("/running", func(ctx *gin.Context) {
		res, err := listRunningExecutions(ctx.Request.Context(), db)

		if err != nil {
			log.Printf("Failed to get running executions; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		var response []ResponseExecution
		for _, execution := range res {
			response = append(response, newResponseExecutionsRow(execution))
		}

		ctx.JSON(http.StatusOK, response)
	})
	execution.POST("/:executionId/terminate", func(ctx *gin.Context) {
		executionId := ctx.Param("executionId")
		res, err := getExecutionById(ctx.Request.Context(), db, executionId)

		if err != nil {
			log.Printf("Failed to get execution; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		argoErr := terminateArgo(ctx, client, db, res.Workflow.String, res.ID)
		if argoErr != nil {
			ctx.String(500, fmt.Sprintf("%v", argoErr))
			return
		}
		response := newResponseExecutionsRow(res)

		ctx.JSON(http.StatusOK, response)
	})

	pipeline := router.Group("/pipeline")
	pipeline.POST("", func(ctx *gin.Context) {
		pipeline, err := validateJson[zjson.Pipeline](ctx.Request.Body)
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
	pipeline.POST("/:uuid/:hash/stop", func(ctx *gin.Context) {
		paramUuid := ctx.Param("uuid")
		hash := ctx.Param("hash")
		res, err := getPipeline(ctx.Request.Context(), db, "org", paramUuid, hash)
		if err != nil {
			log.Printf("Failed to get pipeline; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}
		argoErr := stopArgo(ctx, res.Uuid, client)
		if argoErr != nil {
			ctx.String(500, fmt.Sprintf("%v", argoErr))
			return
		}
		ctx.Status(http.StatusOK)
	})
	pipeline.POST("/:uuid/:hash/execute", func(ctx *gin.Context) {
		paramUuid := ctx.Param("uuid")
		hash := ctx.Param("hash")
		res, err := getPipeline(ctx.Request.Context(), db, "org", paramUuid, hash)
		if err != nil {
			log.Printf("Failed to get pipeline; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		var pipeline zjson.Pipeline
		if err := json.Unmarshal([]byte(res.Json), &pipeline); err != nil {
			ctx.String(http.StatusInternalServerError, err.Error())
			return
		}

		executionId, uuidErr := uuid.NewV7()
		if uuidErr != nil {
			log.Printf("uuid generation failed; err=%v", uuidErr)
			ctx.String(500, fmt.Sprintf("%v", uuidErr))
			return
		}

		// TODO: client needs to handle file uploading to S3
		// along with handling results files
		sink := filepath.Join(pipeline.Sink, "history", executionId.String())
		pipeline.Sink = sink

		if config.IsLocal {
			go localExecute(&pipeline, res.ID, executionId.String(), false, config, client, db, hub)
		} else {
			go cloudExecute(&pipeline, res.ID, executionId.String(), false, config, client, db, hub)
		}

		newRes := make(map[string]any)
		newRes["pipeline"] = res
		newRes["executionId"] = executionId.String()
		ctx.JSON(http.StatusCreated, newRes)
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

	router.Run(fmt.Sprintf(":%d", config.ServerPort))
}
