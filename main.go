package main

import (
	"bufio"
	"bytes"
	"context"
	"database/sql"
	"embed"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"time"

	"fmt"
	"server/zjson"

	"github.com/getsentry/sentry-go"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/invopop/jsonschema"
	jsoniter "github.com/json-iterator/go"
	_ "github.com/mattn/go-sqlite3"
	"github.com/pressly/goose/v3"
	"github.com/xeipuuv/gojsonschema"
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
	BucketName      string
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
	Provider string
	Registry string
	Oracle   `json:"Oracle,omitempty"`
	AWS      `json:"AWS,omitempty"`
	Debug    `json:"Debug,omitempty"`
}

type WebSocketWriter struct {
	Id          string
	MessageFunc func(string, string)
	// Add other fields as needed
}

func (w *WebSocketWriter) Write(p []byte) (n int, err error) {
	message := string(p)
	w.MessageFunc(message, w.Id)
	return len(p), nil
}

func createLogger(id string, messageFunc func(string, string)) io.Writer {
	wsWriter := &WebSocketWriter{
		Id:          id,
		MessageFunc: messageFunc,
	}

	return io.MultiWriter(os.Stdout, wsWriter)
}

func readTempLog(tempLog string) ([]string, error) {
	if _, err := os.Stat(tempLog); os.IsNotExist(err) {
		return []string{}, nil
	}

	file, err := os.Open(tempLog)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	var logData []string
	for scanner.Scan() {
		logData = append(logData, scanner.Text())
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return logData, nil
}

func initialize(obj interface{}) interface{} {
	v := reflect.ValueOf(obj)
	if v.Kind() != reflect.Ptr {
		panic("niltoempty: expected pointer")
	}

	initializeNils(v, map[uintptr]bool{})

	return obj
}

func initializeNils(v reflect.Value, visited map[uintptr]bool) {
	if checkVisited(v, visited) {
		return
	}

	switch v.Kind() {
	case reflect.Pointer:
		if !v.IsNil() {
			initializeNils(v.Elem(), visited)
		}
	case reflect.Slice:
		// Initialize a nil slice.
		if v.IsNil() {
			v.Set(reflect.MakeSlice(v.Type(), 0, 0))
			break
		}

		// Recursively iterate over slice items.
		for i := 0; i < v.Len(); i++ {
			item := v.Index(i)
			initializeNils(item, visited)
		}

	case reflect.Map:
		// Initialize a nil map.
		if v.IsNil() {
			v.Set(reflect.MakeMap(v.Type()))
			break
		}

		// Recursively iterate over map items.
		iter := v.MapRange()
		for iter.Next() {
			// Map element (value) can't be set directly.
			// we have to alloc addressable replacement for it
			elemType := iter.Value().Type()
			subv := reflect.New(elemType).Elem()

			// copy its original value
			subv.Set(iter.Value())

			// replace nil slices and maps inside
			initializeNils(subv, visited)

			// and set the replacement back in map
			v.SetMapIndex(iter.Key(), subv)
		}

	case reflect.Interface:
		// Dereference interface{}.
		if v.IsNil() {
			break
		}

		valueUnderInterface := reflect.ValueOf(v.Interface())
		elemType := valueUnderInterface.Type()
		subv := reflect.New(elemType).Elem()
		subv.Set(valueUnderInterface)

		initializeNils(subv, visited)

		v.Set(subv)

	// Recursively iterate over array elements.
	case reflect.Array:
		for i := 0; i < v.Len(); i++ {
			elem := v.Index(i)
			initializeNils(elem, visited)
		}

	// Recursively iterate over struct fields.
	case reflect.Struct:
		for i := 0; i < v.NumField(); i++ {
			field := v.Field(i)
			initializeNils(field, visited)
		}
	}

}

func checkVisited(v reflect.Value, visited map[uintptr]bool) bool {
	kind := v.Kind()
	if kind == reflect.Map || kind == reflect.Ptr || kind == reflect.Slice {
		if v.IsNil() {
			return false
		}
		p := v.Pointer()
		wasVisited := visited[p]
		visited[p] = true
		return wasVisited
	}
	return false
}

var json jsoniter.API

func init() {
	json = jsoniter.Config{
		SortMapKeys: false,
	}.Froze()
}

func validateJson[D any](body io.ReadCloser) (D, HTTPError) {
	var data D
	r := jsonschema.Reflector{
		RequiredFromJSONSchemaTags: false,
		AllowAdditionalProperties:  false,
		ExpandedStruct:             true,
	}
	schema, err := json.Marshal(r.Reflect(data))

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
		jsonError, err := json.Marshal(stringError)
		if err != nil {
			return data, BadRequest{stringError}
		}
		return data, BadRequest{string(jsonError)}
	}

	json := jsoniter.Config{
		SortMapKeys: false,
	}.Froze()

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

func getPrefix(ctx *gin.Context) string {
	prefix, ok := ctx.Get("prefix")
	if ok {
		return prefix.(string)
	} else {
		return "org"
	}
}

func isWebSocketRequest(r *http.Request) bool {
	return r.Header.Get("Upgrade") == "websocket" &&
		r.Header.Get("Connection") == "Upgrade"
}

func main() {
	ctx := context.Background()
	configPath := os.Getenv("ZETAFORGE_CONFIG")
	if configPath == "" {
		configPath = "config.json"
	}

	certsPath := os.Getenv("ZETAFORGE_CERTS")
	if certsPath == "" {
		certsPath = "certs"
	}

	file, err := os.ReadFile(configPath)
	if err != nil {
		log.Fatalf("config file missing; err=%v", err)
		return
	}
	var config Config
	if err := json.Unmarshal(file, &config); err != nil {
		log.Fatalf("config file invalid; err=%v", err)
		return
	}

	//Initialize mixpanelClient only once(it's singleton)
	mixpanelClient = InitMixpanelClient(ctx, "4c09914a48f08de1dbe3dc4dd2dcf90d", config)
	setupSentry()

	db, err := sql.Open("sqlite3", config.Database)
	if err != nil {
		log.Fatalf("failed to load database; err=%v", err)
	}

	goose.SetBaseFS(migrations)

	if err := goose.SetDialect(string(goose.DialectSQLite3)); err != nil {
		log.Fatalf("failed to set database dialect; err=%v", err)
	}

	if err := goose.Up(db, "db/migrations"); err != nil {
		log.Fatalf("failed to migrate database; err=%v", err)
	}

	router := gin.Default()

	if config.IsLocal || config.Cloud.Provider == "Debug" {
		// Switching to Cobra if we need more arguments
		if len(os.Args) > 1 {
			if os.Args[1] == "--uninstall" {
				uninstall(ctx, config, db)
				return
			}
			os.Exit(1)
		}
		setup(ctx, config, db)
	} else {
		router.Use(func(ctx *gin.Context) {
			if ctx.Request.Method == "OPTIONS" {
				ctx.Next()
				return
			}

			headerKey := "Authorization"
			if isWebSocketRequest(ctx.Request) {
				headerKey = "Sec-WebSocket-Protocol"
			}

			token := ctx.GetHeader(headerKey)
			code, prefix := validateToken(token, certsPath)
			if code != http.StatusOK {
				ctx.AbortWithStatus(code)
				return
			}
			ctx.Set("prefix", prefix)
			ctx.Next()
		})
	}

	hub := newHub()
	go hub.Run()

	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, PATCH, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		// Handle OPTIONS requests for CORS preflight
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusOK)
			return
		}
		c.Next()
	})

	router.GET("/ping", func(ctx *gin.Context) {
		ctx.String(http.StatusOK, "pong")
	})
	router.POST("/execute", func(ctx *gin.Context) {
		prefix := getPrefix(ctx)
		execution, err := validateJson[zjson.Execution](ctx.Request.Body)
		if err != nil {
			log.Printf("invalid json request; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		res, err := createPipeline(ctx.Request.Context(), db, prefix, execution.Pipeline)
		if err != nil {
			log.Printf("failed to create pipeline; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}
		newExecution, err := createExecution(ctx, db, res.ID, execution.Id)

		if err != nil {
			log.Printf("failed to write execution to database; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}
		if config.IsLocal || config.Cloud.Provider == "Debug" {
			go localExecute(&execution.Pipeline, newExecution.ID, execution.Id, prefix, execution.Build, config, db, hub)
		} else {
			go cloudExecute(&execution.Pipeline, newExecution.ID, execution.Id, prefix, execution.Build, config, db, hub)
		}

		retData, err := filterPipeline(ctx, db, execution.Id)
		if err != nil {
			log.Printf("failed to get pipeline record; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}
		response, err := newResponsePipelineExecution(retData, []string{})
		if err != nil {
			log.Printf("failed to create response payload; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}
		ctx.JSON(http.StatusCreated, response)
	})
	router.GET("/rooms", func(ctx *gin.Context) {
		rooms := hub.GetRooms()
		ctx.JSON(http.StatusOK, rooms)
	})
	router.GET("/ws/:room", func(ctx *gin.Context) {
		room := ctx.Param("room")

		upgrader := websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")
				allowedOrigins := []string{
					"http://localhost", "https://localhost",
					"http://127.0.0.1", "https://127.0.0.1",
					"file://",
				}
				for _, allowed := range allowedOrigins {
					if strings.HasPrefix(origin, allowed) {
						return true
					}
				}
				return false
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			Subprotocols:    []string{"Bearer"},
		}

		if !websocket.IsWebSocketUpgrade(ctx.Request) {
			ctx.String(http.StatusBadRequest, "Not a WebSocket handshake")
			return
		}

		// Check if the room exists before upgrading
		if _, ok := hub.Clients[room]; !ok {
			log.Printf("Room %s does not exist", room)
			ctx.Header("Sec-WebSocket-Version", "13")
			ctx.Header("Connection", "close")
			ctx.String(http.StatusBadRequest, "Room does not exist")
			return
		}

		conn, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
		if err != nil {
			// If the upgrade fails, then Upgrade replies to the client with an HTTP error response.
			log.Printf("Failed to upgrade connection: %v", err)
			return
		}

		if err := serveSocket(conn, room, hub); err != nil {
			log.Printf("Websocket error; err=%v", err)
			// The connection is already upgraded, so we can't use ctx.String here
			// Instead, send a close message through the WebSocket
			closeMsg := websocket.FormatCloseMessage(websocket.CloseInternalServerErr, err.Error())
			conn.WriteMessage(websocket.CloseMessage, closeMsg)
			conn.Close()
		}
	})
	router.POST("/build-context-status", func(ctx *gin.Context) {
		prefix := getPrefix(ctx)
		pipeline, err := validateJson[zjson.Pipeline](ctx.Request.Body)
		if err != nil {
			log.Printf("invalid json request; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		buildContextStatus := getBuildContextStatus(ctx.Request.Context(), &pipeline, prefix, config)

		ctx.JSON(http.StatusOK, buildContextStatus)
	})

	execution := router.Group("/execution")
	execution.GET("/running", func(ctx *gin.Context) {
		res, err := listRunningExecutions(ctx.Request.Context(), db)

		if err != nil {
			log.Printf("failed to get running executions; err=%v", err)
		}

		var response []ResponseExecution
		for _, execution := range res {
			response = append(response, newResponseExecutionsRow(execution))
		}

		ctx.JSON(http.StatusOK, response)
	})
	execution.GET("/:executionId/log", func(ctx *gin.Context) {
		executionId := ctx.Param("executionId")
		res, err := getExecutionById(ctx.Request.Context(), db, executionId)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve execution"})
			return
		}

		tempLog := filepath.Join(os.TempDir(), executionId+".log")
		if res.Status == "Running" {
			logData, err := readTempLog(tempLog)
			if err != nil {
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read temporary log"})
				return
			}
			ctx.JSON(http.StatusOK, logData)
		} else {
			ctx.JSON(http.StatusOK, []string{})
		}
	})
	execution.POST("/:executionId/terminate", func(ctx *gin.Context) {
		executionId := ctx.Param("executionId")
		res, err := getExecutionById(ctx.Request.Context(), db, executionId)

		if err != nil {
			log.Printf("failed to get execution; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		argoErr := terminateArgo(ctx, config, db, res.Workflow.String, res.ID)
		if argoErr != nil {
			ctx.String(http.StatusInternalServerError, fmt.Sprintf("%v", argoErr))
			return
		}
		response := newResponseExecutionsRow(res)

		ctx.JSON(http.StatusOK, response)
	})

	pipeline := router.Group("/pipeline")
	pipeline.POST("", func(ctx *gin.Context) {
		prefix := getPrefix(ctx)
		pipeline, err := validateJson[zjson.Pipeline](ctx.Request.Body)
		if err != nil {
			log.Printf("Invalid json request; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		res, err := createPipeline(ctx.Request.Context(), db, prefix, pipeline)
		if err != nil {
			log.Printf("failed to create pipeline; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		response, err := newResponsePipeline(res)
		if err != nil {
			ctx.String(err.Status(), err.Error())
			return
		}

		ctx.JSON(http.StatusCreated, response)
	})
	pipeline.GET("/list", func(ctx *gin.Context) {
		prefix := getPrefix(ctx)
		res, err := listAllPipelines(ctx.Request.Context(), db, prefix)

		if err != nil {
			log.Printf("Failed to list pipelines; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		var response []ResponsePipeline
		for _, pipeline := range res {
			newRes, err := newResponsePipeline(pipeline)
			if err != nil {
				ctx.String(err.Status(), err.Error())
				return
			}
			response = append(response, newRes)
		}

		ctx.JSON(http.StatusOK, response)
	})
	pipeline.GET("/filter", func(ctx *gin.Context) {
		// TODO: Figure out how to get SQLC to emit the same struct for two different queries
		limitStr := ctx.DefaultQuery("limit", "0")
		offsetStr := ctx.DefaultQuery("offset", "0")

		limit, err := strconv.Atoi(limitStr)
		if err != nil {
			log.Printf("Invalid limit parameter: %s", limitStr)
			ctx.String(http.StatusBadRequest, "Invalid limit parameter")
			return
		}

		offset, err := strconv.Atoi(offsetStr)
		if err != nil {
			log.Printf("Invalid offset parameter: %s", offsetStr)
			ctx.String(http.StatusBadRequest, "Invalid offset parameter")
			return
		}

		res, httpErr := filterPipelines(ctx, db, int64(limit), int64(offset))
		if httpErr != nil {
			log.Printf("failed to get filter pipelines; err=%v", httpErr)
			ctx.String(httpErr.Status(), httpErr.Error())
			return
		}

		var response []ResponsePipelineExecution
		for _, execution := range res {
			logOutput := []string{}
			logDir, exists := os.LookupEnv("ZETAFORGE_LOGS")
			if !exists {
				logDir = os.TempDir()
			}
			tempLog := filepath.Join(logDir, execution.Executionid+".log")

			var s3key string
			if execution.Status == "Running" || execution.Status == "Pending" {
				logOutput, err = readTempLog(tempLog)
				if err != nil {
					fmt.Printf("failed to retrieve writing log; err=%v", err)
				}
			} else {
				s3key = execution.Uuid + "/" + execution.Executionid + "/" + execution.Executionid + ".log"
				// in certain cases the pipeline has succeeded or failed but
				// has not yet uploaded to s3, so still attempt to send the tempLog
				logOutput, err = readTempLog(tempLog)

				if err != nil {
					fmt.Printf("no temp log on the server; err=%v\n", err)
				}
			}
			newRes, err := newResponsePipelinesExecution(execution, logOutput, s3key)
			if err != nil {
				ctx.String(err.Status(), err.Error())
				return
			}
			response = append(response, newRes)
		}

		ctx.JSON(http.StatusOK, response)
	})
	pipeline.DELETE("/:uuid/:hash", func(ctx *gin.Context) {
		prefix := getPrefix(ctx)
		uuid := ctx.Param("uuid")
		hash := ctx.Param("hash")

		if err := softDeletePipeline(ctx.Request.Context(), db, prefix, uuid, hash); err != nil {
			log.Printf("failed to delete pipeline; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}
	})
	pipeline.PATCH("/:uuid/:hash/deploy", func(ctx *gin.Context) {
		prefix := getPrefix(ctx)
		uuid := ctx.Param("uuid")
		hash := ctx.Param("hash")

		if err := deployPipeline(ctx.Request.Context(), db, prefix, uuid, hash); err != nil {
			log.Printf("failed to deploy pipeline; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}
	})
	pipeline.GET("/:uuid/list", func(ctx *gin.Context) {
		prefix := getPrefix(ctx)
		uuid := ctx.Param("uuid")

		res, err := listAllExecutions(ctx.Request.Context(), db, prefix, uuid)

		if err != nil {
			log.Printf("failed to list executions; err=%v", err)
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
		prefix := getPrefix(ctx)
		uuid := ctx.Param("uuid")
		hash := ctx.Param("hash")
		index, err := strconv.Atoi(ctx.Param("index"))
		if err != nil {
			ctx.String(http.StatusBadRequest, "Invalid index")
			return
		}

		res, httpErr := getExecution(ctx.Request.Context(), db, prefix, uuid, hash, index)
		if httpErr != nil {
			log.Printf("failed to delete execution; err=%v", err)
			ctx.String(httpErr.Status(), httpErr.Error())
			return
		}

		ctx.JSON(http.StatusOK, newResponseExecution(res, hash))
	})
	pipeline.GET("/:uuid/:hash/list", func(ctx *gin.Context) {
		prefix := getPrefix(ctx)
		uuid := ctx.Param("uuid")
		hash := ctx.Param("hash")

		res, err := listExecutions(ctx.Request.Context(), db, prefix, uuid, hash)

		if err != nil {
			log.Printf("failed to list executions; err=%v", err)
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
		prefix := getPrefix(ctx)
		paramUuid := ctx.Param("uuid")
		hash := ctx.Param("hash")
		res, err := getPipeline(ctx.Request.Context(), db, prefix, paramUuid, hash)
		if err != nil {
			log.Printf("failed to get pipeline; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}
		argoErr := stopArgo(ctx, res.Uuid, config)
		if argoErr != nil {
			ctx.String(http.StatusInternalServerError, fmt.Sprintf("%v", argoErr))
			return
		}
		ctx.Status(http.StatusOK)
	})
	pipeline.POST("/:uuid/:hash/execute", func(ctx *gin.Context) {
		prefix := getPrefix(ctx)
		paramUuid := ctx.Param("uuid")
		hash := ctx.Param("hash")
		res, err := getPipeline(ctx.Request.Context(), db, prefix, paramUuid, hash)
		if err != nil {
			log.Printf("failed to get pipeline; err=%v", err)
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

		newExecution, err := createExecution(ctx, db, res.ID, executionId.String())

		if err != nil {
			log.Printf("failed to write execution to database; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}

		if config.IsLocal || config.Cloud.Provider == "Debug" {
			go localExecute(&pipeline, res.ID, executionId.String(), prefix, false, config, db, hub)
		} else {
			go cloudExecute(&pipeline, newExecution.ID, executionId.String(), prefix, false, config, db, hub)
		}

		newRes := make(map[string]any)
		newRes["pipeline"] = res
		newRes["executionId"] = executionId.String()
		ctx.JSON(http.StatusCreated, newRes)
	})

	pipeline.DELETE("/:uuid/:hash/:index", func(ctx *gin.Context) {
		prefix := getPrefix(ctx)
		uuid := ctx.Param("uuid")
		hash := ctx.Param("hash")
		index, err := strconv.Atoi(ctx.Param("index"))
		if err != nil {
			ctx.String(http.StatusBadRequest, "Invalid index")
			return
		}

		if err := softDeleteExecution(ctx.Request.Context(), db, prefix, uuid, hash, index); err != nil {
			log.Printf("failed to delete execution; err=%v", err)
			ctx.String(err.Status(), err.Error())
			return
		}
	})

	if config.IsLocal || config.Cloud.Provider == "Debug" {
		router.Run(fmt.Sprintf(":%d", config.ServerPort))
	} else {
		tlsCertPath := os.Getenv("TLS_CERT_PATH")
		tlsKeyPath := os.Getenv("TLS_KEY_PATH")

		err := router.SetTrustedProxies(nil)
		if err != nil {
			log.Fatalf("trusted proxies incorrectly set; err=%v", err)
		}
		err = router.RunTLS(fmt.Sprintf(":%d", config.ServerPort), tlsCertPath, tlsKeyPath)
		if err != nil {
			log.Fatalf("failed to start server; err=%v", err)
		}
	}
}
