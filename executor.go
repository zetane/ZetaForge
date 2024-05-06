package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"server/zjson"

	"github.com/argoproj/argo-workflows/v3/pkg/apiclient"
	workflowpkg "github.com/argoproj/argo-workflows/v3/pkg/apiclient/workflow"
	wfv1 "github.com/argoproj/argo-workflows/v3/pkg/apis/workflow/v1alpha1"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	endpoints "github.com/aws/smithy-go/endpoints"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"golang.org/x/net/context"
	"golang.org/x/sync/errgroup"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/tools/clientcmd"
)

const BUCKET = "zetaforge"

type Endpoint struct {
	Bucket string
	S3Port string
}

func (endpoint *Endpoint) ResolveEndpoint(ctx context.Context, params s3.EndpointParameters) (endpoints.Endpoint, error) {
	uri, err := url.Parse("http://localhost:" + endpoint.S3Port + "/" + endpoint.Bucket)
	return endpoints.Endpoint{URI: *uri}, err
}

func s3Client(ctx context.Context, cfg Config) (*s3.Client, error) {
	awsAccessKey := "AKIAIOSFODNN7EXAMPLE"
	awsSecretKey := "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
	creds := credentials.NewStaticCredentialsProvider(awsAccessKey, awsSecretKey, "")
	region := config.WithRegion("us-east-2")
	awsConfig, err := config.LoadDefaultConfig(ctx, region, config.WithCredentialsProvider(creds))
	if err != nil {
		return &s3.Client{}, err
	}
	client := s3.NewFromConfig(awsConfig, func(o *s3.Options) {
		o.EndpointResolverV2 = &Endpoint{Bucket: BUCKET, S3Port: cfg.Local.BucketPort}
	})

	return client, nil
}

func upload(ctx context.Context, source string, key string, cfg Config) error {
	file, err := os.Open(source)
	if err != nil {
		return err
	}
	defer file.Close()
	client, err := s3Client(ctx, cfg)
	if err != nil {
		return err
	}

	params := &s3.PutObjectInput{
		Bucket: aws.String(BUCKET),
		Key:    aws.String(key),
		Body:   file,
	}

	_, err = client.PutObject(ctx, params)
	return err
}

func uploadFiles(ctx context.Context, source string, prefix string, cfg Config) error {
	err := filepath.Walk(source, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.Mode().IsRegular() {
			return nil
		}

		name := filepath.ToSlash(strings.TrimPrefix(
			strings.Replace(path, filepath.Clean(source), "", -1),
			string(filepath.Separator),
		))

		return upload(ctx, path, prefix+name, cfg)
	})

	return err
}

func tarFile(source string, key string) error {
	file, err := os.Create(key)

	if err != nil {
		return err
	}
	defer file.Close()

	gzw := gzip.NewWriter(file)
	defer gzw.Close()

	tw := tar.NewWriter(gzw)
	defer tw.Close()

	err = filepath.Walk(source, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.Mode().IsRegular() {
			return nil
		}

		header, err := tar.FileInfoHeader(info, info.Name())

		if err != nil {
			return err
		}

		header.Name = filepath.ToSlash(strings.TrimPrefix(strings.Replace(path, source, "", -1), string(filepath.Separator)))

		if err := tw.WriteHeader(header); err != nil {
			return err
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}

		if _, err := io.Copy(tw, file); err != nil {
			return err
		}

		return file.Close()
	})

	return err
}

func uploadTar(ctx context.Context, source string, buildFile string, uploadKey string, cfg Config) error {
	if err := tarFile(source, buildFile); err != nil {
		return err
	}
	defer os.Remove(buildFile)

	if err := upload(ctx, buildFile, uploadKey, cfg); err != nil {
		return err
	}

	return nil
}

func downloadFiles(ctx context.Context, sink string, prefix string, cfg Config) error {
	client, err := s3Client(ctx, cfg)
	if err != nil {
		return err
	}

	res, err := client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(BUCKET),
		Prefix: aws.String(prefix),
	})

	if err != nil {
		return err
	}

	for _, content := range res.Contents {
		pathWithoutPrefix := strings.TrimPrefix(*content.Key, prefix)
		dirPath, filename := filepath.Split(pathWithoutPrefix)

		// note this is temporary, as this code will be moved to the frontend
		location := filepath.Join(sink, "files", dirPath)
		if err := os.MkdirAll(location, 0755); err != nil {
			return err
		}
		result, err := client.GetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(BUCKET),
			Key:    content.Key,
		})

		if err != nil {
			return err
		}

		file, err := os.OpenFile(filepath.Join(location, filename), os.O_CREATE|os.O_RDWR, 0644)
		if err != nil {
			result.Body.Close()
			return err
		}

		if _, err := io.Copy(file, result.Body); err != nil {
			result.Body.Close()
			return err
		}

		result.Body.Close()
	}

	return nil
}

func deleteFiles(ctx context.Context, prefix string, extraFiles []string, cfg Config) {
	log.Printf("Deleting: %s", prefix)
	client, err := s3Client(ctx, cfg)
	if err != nil {
		log.Printf("Failed to delete files; err=%v", err)
		return
	}

	params := &s3.DeleteObjectsInput{
		Bucket: aws.String(BUCKET),
		Delete: &s3types.Delete{
			Objects: []s3types.ObjectIdentifier{},
		},
	}

	res, err := client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(BUCKET),
		Prefix: aws.String(prefix),
	})

	for _, content := range res.Contents {
		params.Delete.Objects = append(params.Delete.Objects, s3types.ObjectIdentifier{
			Key: content.Key,
		})
	}

	for _, file := range extraFiles {
		params.Delete.Objects = append(params.Delete.Objects, s3types.ObjectIdentifier{
			Key: aws.String(file),
		})
	}

	_, err = client.DeleteObjects(ctx, params)
	if err != nil {
		log.Printf("Failed to delete files; err=%v", err)
	}
}

func history(sinkPath string) error {
	if err := os.MkdirAll(sinkPath, 0755); err != nil {
		return err
	}
	if err := os.Mkdir(filepath.Join(sinkPath, "files"), 0755); err != nil {
		return err
	}
	if err := os.Mkdir(filepath.Join(sinkPath, "pipeline"), 0755); err != nil {
		return err
	}
	if err := os.Mkdir(filepath.Join(sinkPath, "logs"), 0755); err != nil {
		return err
	}
	if err := os.Mkdir(filepath.Join(sinkPath, "results"), 0755); err != nil {
		return err
	}
	return nil
}

func writeFile(path string, content string) error {
	file, err := os.Create(path)
	if err != nil {
		return err
	}

	if _, err := file.WriteString(content); err != nil {
		return err
	}

	return file.Close()
}

func results(path string, pipeline *zjson.Pipeline, workflow *wfv1.Workflow) error {
	for _, node := range workflow.Status.Nodes {
		if node.Type == "Pod" {
			block := pipeline.Pipeline[node.TemplateName]
			block.Events.Inputs = make(map[string]string)
			block.Events.Outputs = make(map[string]string)
			for _, parameter := range node.Inputs.Parameters {
				block.Events.Inputs[string(parameter.Name)] = string(*parameter.Value)
			}
			for _, parameter := range node.Outputs.Parameters {
				block.Events.Outputs[string(parameter.Name)] = string(*parameter.Value)
			}
			pipeline.Pipeline[node.TemplateName] = block
		}
	}

	data, err := json.MarshalIndent(pipeline, "", "  ")
	if err != nil {
		return err
	}

	return writeFile(path, string(data))
}

func streaming(ctx context.Context, sink string, name string, room string, client clientcmd.ClientConfig, hub *Hub) {
	ctx, cli, err := apiclient.NewClientFromOpts(
		apiclient.Opts{
			ClientConfigSupplier: func() clientcmd.ClientConfig {
				return client
			},
			Context: ctx,
		},
	)

	if err != nil {
		log.Printf("Log stream error; err=%v", err)
		return
	}

	namespace, _, err := client.Namespace()

	if err != nil {
		log.Printf("Log stream error; err=%v", err)
		return
	}

	serviceClient := cli.NewWorkflowServiceClient()
	containerStream := func(containerName string) {
		stream, err := serviceClient.WorkflowLogs(ctx, &workflowpkg.WorkflowLogRequest{
			Namespace: namespace,
			Name:      name,
			LogOptions: &corev1.PodLogOptions{
				Container: containerName,
				Follow:    true,
			},
		})

		if err != nil {
			log.Printf("Log stream error; err=%v", err)
			return
		}

		logMap := make(map[string][]string)

		for {
			event, err := stream.Recv()

			if err == io.EOF {
				break
			} else if err != nil {
				log.Printf("Log stream error; err=%v", err)
				break
			}
			// Remove the square brackets from the string
			blockId := ""
			blockId = strings.TrimPrefix(event.PodName, "[")
			blockId = strings.TrimSuffix(blockId, "]")

			parts := strings.Split(blockId, "-")

			// Extract the desired parts
			if len(parts) >= 4 {
				blockId = strings.Join(parts[2:len(parts)-1], "-")
			} else {
				fmt.Println("Invalid input string format")
			}

			hub.Broadcast <- Message{
				Room:    room,
				Content: fmt.Sprintf("[%s]:::: %s", blockId, event.Content),
			}

			logMap[blockId] = append(logMap[blockId], event.Content)
		}

		if sink != "" {
			for podname, logs := range logMap {
				path := filepath.Join(sink, "logs", podname+"-"+containerName+".log")
				if err := writeFile(path, strings.Join(logs, "\n")); err != nil {
					log.Printf("Log stream error; err=%v", err)
				}
			}
		}
	}

	for _, container := range []string{"init", "wait", "main"} {
		go containerStream(container)
	}
}

func runArgo(ctx context.Context, workflow *wfv1.Workflow, sink string, pipeline string, execution int64, client clientcmd.ClientConfig, db *sql.DB, hub *Hub) (*wfv1.Workflow, error) {
	ctx, cli, err := apiclient.NewClientFromOpts(
		apiclient.Opts{
			ClientConfigSupplier: func() clientcmd.ClientConfig {
				return client
			},
			Context: ctx,
		},
	)

	if err != nil {
		return nil, err
	}

	namespace, _, err := client.Namespace()

	if err != nil {
		return nil, err
	}

	serviceClient := cli.NewWorkflowServiceClient()
	workflow, err = serviceClient.CreateWorkflow(ctx, &workflowpkg.WorkflowCreateRequest{
		Namespace: namespace,
		Workflow:  workflow,
	})

	if err != nil {
		return workflow, err
	}

	go streaming(ctx, sink, workflow.Name, pipeline, client, hub)
	status := string(workflow.Status.Phase)

	for {
		workflow, err = serviceClient.GetWorkflow(ctx, &workflowpkg.WorkflowGetRequest{
			Name:      workflow.Name,
			Namespace: namespace,
		})

		if err != nil {
			return workflow, err
		}

		log.Printf("Status: %s", status)

		if string(workflow.Status.Phase) != status {
			status = string(workflow.Status.Phase)
			updateExecutionStatus(ctx, db, execution, status)
		}

		if workflow.Status.Phase.Completed() {
			log.Printf("Status: Completed")
			break
		}
		time.Sleep(time.Second)
	}

	if workflow.Status.Phase != wfv1.WorkflowSucceeded {
		errorCode := ""
		for name, node := range workflow.Status.Nodes {
			if node.Type == wfv1.NodeTypePod {
				if node.Phase == wfv1.NodeFailed || node.Phase == wfv1.NodeError {
					errorCode += name + ": " + node.Message
				}
			}
		}
		return workflow, errors.New(errorCode)
	}

	return workflow, nil
}

func deleteArgo(ctx context.Context, name string, client clientcmd.ClientConfig) {
	ctx, cli, err := apiclient.NewClientFromOpts(
		apiclient.Opts{
			ClientConfigSupplier: func() clientcmd.ClientConfig {
				return client
			},
			Context: ctx,
		},
	)

	namespace, _, err := client.Namespace()

	if err != nil {
		log.Printf("Failed to delete workflow %s; err=%v", name, err)
		return
	}

	serviceClient := cli.NewWorkflowServiceClient()
	_, err = serviceClient.DeleteWorkflow(ctx, &workflowpkg.WorkflowDeleteRequest{
		Name:      name,
		Namespace: namespace,
		Force:     false,
	})

	if err != nil {
		log.Printf("Failed to delete workflow %s; err=%v", name, err)
	}
}

func buildImage(ctx context.Context, source string, tag string) error {

	dockerClient, err := client.NewClientWithOpts(
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return err
	}
	defer dockerClient.Close()

	buff := bytes.NewBuffer(nil)
	tw := tar.NewWriter(buff)
	err = filepath.Walk(source, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.Mode().IsRegular() {
			return nil
		}

		header, err := tar.FileInfoHeader(info, info.Name())

		if err != nil {
			return err
		}

		header.Name = filepath.ToSlash(strings.TrimPrefix(strings.Replace(path, source, "", -1), string(filepath.Separator)))

		if err := tw.WriteHeader(header); err != nil {
			return err
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}

		if _, err := io.Copy(tw, file); err != nil {
			return err
		}

		return file.Close()
	})
	if err != nil {
		return err
	}
	if err := tw.Close(); err != nil {
		return err
	}

	resp, err := dockerClient.ImageBuild(ctx, buff, types.ImageBuildOptions{
		Tags:        []string{tag},
		Remove:      true,
		ForceRemove: true,
	})
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	stream := make([]byte, 100)

	for {
		n, err := resp.Body.Read(stream)
		if err == io.EOF {
			return nil
		} else if err != nil {
			return err
		}
		log.Println(string(stream[:n]))
	}
}

func localExecute(pipeline *zjson.Pipeline, id int64, executionId string, cfg Config, client clientcmd.ClientConfig, db *sql.DB, hub *Hub) {
	ctx := context.Background()
	defer log.Printf("Completed")

	execution, err := createExecution(ctx, db, id, executionId)
	if err != nil {
		log.Printf("Failed to write execution to database; err=%v", err)
		return
	}
	defer completeExecution(ctx, db, execution.ID)

	if err := hub.OpenRoom(pipeline.Id); err != nil {
		log.Printf("Failed to open log room; err=%v", err)
		return
	}

	defer hub.CloseRoom(pipeline.Id)

	if err := upload(ctx, cfg.EntrypointFile, cfg.EntrypointFile, cfg); err != nil { // should never fail
		log.Printf("Failed to upload entrypoint file; err=%v", err)
		return
	}

	if err := history(pipeline.Sink); err != nil {
		log.Printf("Failed to build history folder; err=%v", err)
		return
	}

	file, err := os.OpenFile(filepath.Join(pipeline.Sink, "logs", pipeline.Id+".txt"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("Error creating pipeline log: %v", err)
	}

	pipelineLogger := createLogger(pipeline.Id, file, func(message string, pipelineId string) {
		if pipelineId != "" {
			hub.Broadcast <- Message{
				Room:    pipelineId,
				Content: fmt.Sprintf("[executor-%s]:::: %s", pipelineId, message),
			}
		}
		//fmt.Printf("[executor]:: %s", message)
	})
	log.SetOutput(pipelineLogger)

	defer file.Close()

	jsonData, err := json.MarshalIndent(pipeline, "", "  ")
	if err != nil {
		log.Printf("Invalid pipeline.json; err=%v", err)
		return
	}
	if err := writeFile(filepath.Join(pipeline.Sink, "pipeline", "pipeline.json"), string(jsonData)); err != nil {
		log.Printf("Failed to write pipeline.json; err=%v", err)
		return
	}

	log.Printf("*** Writing pipeline history to: %v", pipeline.Sink)

	s3key := pipeline.Id + "/" + executionId

	workflow, blocks, err := translate(ctx, pipeline, "org", cfg, s3key)
	if err != nil {
		log.Printf("Failed to translate the pipeline; err=%v", err)
		return
	}

	jsonWorkflow, err := json.MarshalIndent(&workflow, "", "  ")
	if err != nil {
		log.Printf("Invalid translated pipeline.json; err=%v", err)
		return
	}

	if err := writeFile(filepath.Join(pipeline.Sink, pipeline.Id+".json"), string(jsonWorkflow)); err != nil {
		log.Printf("Failed to write translated pipeline.json; err=%v", err)
		return
	}

	if err := updateExecutionWorkflow(ctx, db, execution.ID, workflow); err != nil {
		log.Printf("Failed to write workflow to database; err=%v", err)
		return
	}

	executionFiles := s3key

	eg, egCtx := errgroup.WithContext(ctx)
	eg.SetLimit(runtime.NumCPU())

	uploadedFiles := []string{}
	for path, image := range blocks {
		log.Printf("Path: %s", path)
		log.Printf("Image: %s", image)
		if _, err := os.Stat(filepath.Join(path, cfg.ComputationFile)); err != nil {
			deleteFiles(ctx, executionFiles, uploadedFiles, cfg)
			log.Printf("Computation file does not exist; err=%v", err)
			return
		}

		if len(image) > 0 {
			eg.Go(func() error {
				return buildImage(egCtx, path, image)
			})
		}

		name := s3key + "/" + filepath.Base(path) + ".py"
		if err := upload(ctx, filepath.Join(path, cfg.ComputationFile), name, cfg); err != nil {
			deleteFiles(ctx, executionFiles, uploadedFiles, cfg)
			log.Printf("Failed to upload computation file; err=%v", err)
			return
		}
		uploadedFiles = append(uploadedFiles, name)
	}

	if err := eg.Wait(); err != nil {
		log.Printf("Error during pipeline execution; err=%v", err)
		return
	}

	workflow, err = runArgo(ctx, workflow, pipeline.Sink, pipeline.Id, execution.ID, client, db, hub)
	if workflow != nil {
		defer deleteArgo(ctx, workflow.Name, client)
	}
	if err != nil {
		log.Printf("Error during pipeline execution; err=%v", err)
		return
	}

	if err := results(filepath.Join(pipeline.Sink, "results", "results.json"), pipeline, workflow); err != nil {
		log.Printf("Failed to download results; err=%v", err)
		return
	}

	if err := downloadFiles(ctx, pipeline.Sink, executionFiles, cfg); err != nil {
		log.Printf("Failed to download files; err=%v", err)
		return
	}
}

func cloudExecute(pipeline *zjson.Pipeline, id int64, executionId string, cfg Config, client clientcmd.ClientConfig, db *sql.DB, hub *Hub) {
	ctx := context.Background()
	defer log.Printf("Completed")

	execution, err := createExecution(ctx, db, id, executionId)
	if err != nil {
		log.Printf("Failed to write execution to database; err=%v", err)
		return
	}
	defer completeExecution(ctx, db, execution.ID)

	if err := hub.OpenRoom(pipeline.Id); err != nil {
		log.Printf("Failed to open log room; err=%v", err)
		return
	}
	defer hub.CloseRoom(pipeline.Id)

	s3key := pipeline.Id + "/" + executionId

	workflow, _, err := translate(ctx, pipeline, "org", cfg, s3key)
	if err != nil {
		log.Printf("Failed to translate the pipeline; err=%v", err)
		return
	}

	if err := updateExecutionWorkflow(ctx, db, execution.ID, workflow); err != nil {
		log.Printf("Failed to write workflow to database; err=%v", err)
		return
	}

	workflow, err = runArgo(ctx, workflow, "", pipeline.Id, execution.ID, client, db, hub)
	if workflow != nil {
		defer deleteArgo(ctx, workflow.Name, client)
	}
	if err != nil {
		log.Printf("Error during pipeline execution; err=%v", err)
		return
	}
}
