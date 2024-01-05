package main

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
    "os"
	"strings"


	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/gin-gonic/gin"
	"github.com/invopop/jsonschema"
	"github.com/xeipuuv/gojsonschema"
	"server/zjson"
)

type Config struct {
    ServerPort string 
    IsLocal bool 
    KanikoImage string 
    Bucket string 
    S3Port string 
    RegistryPort string 
    ComputationFile string 
    EntrypointFile string 
    WorkDir string 
    FileDir string 
}

func localConfig(cfg Config) gin.HandlerFunc {
    if cfg.IsLocal {
        awsAccessKey := "AKIAIOSFODNN7EXAMPLE"
        awsSecretKey := "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        creds := credentials.NewStaticCredentialsProvider(awsAccessKey, awsSecretKey, "")
        region := config.WithRegion("us-east-2") 
        awsConfig, err := config.LoadDefaultConfig(context.TODO(), region, config.WithCredentialsProvider(creds))
        if err != nil {
            log.Fatalf("Local credentials missing; err=%v", err)
        }
        return func(ctx *gin.Context) {
            ctx.Set("cfg", cfg)
            ctx.Set("aws", awsConfig)
            ctx.Next()
        }
    } else {
        return func(ctx *gin.Context) {
            ctx.Set("cfg", cfg)
            ctx.Next()
        }
    }
}

func run(ctx *gin.Context) {
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

    awsConfig, ok := ctx.Get("aws")

    if !ok {
        log.Printf("AWS config is missing")
        ctx.String(http.StatusInternalServerError, "AWS config is missing")
        return 
    }

    cfg, ok := ctx.Get("cfg")

    if !ok {
        log.Printf("Config is missing")
        ctx.String(http.StatusInternalServerError, "Config is missing")
        return 
    }
 
    go execute(pipeline, cfg.(Config), awsConfig.(aws.Config))

    ctx.String(http.StatusOK, "") 
}

func main() {
    file, err := os.ReadFile("config.json")
    if err != nil {
        log.Fatalf("Config file missing; err=%v", err)
        return
    }
    var config Config 
    if err:= json.Unmarshal(file, &config); err != nil {
        log.Fatalf("Config file invalid; err=%v", err)
        return
    }

    router := gin.Default()
    router.Use(localConfig(config))
    router.POST("/run", run)

    router.Run(":" + config.ServerPort)
}
