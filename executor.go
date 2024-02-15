package main

import (
	"archive/tar"
	"compress/gzip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"server/zjson"

	"github.com/argoproj/argo-workflows/v3/pkg/apiclient"
	workflowpkg "github.com/argoproj/argo-workflows/v3/pkg/apiclient/workflow"
	wfv1 "github.com/argoproj/argo-workflows/v3/pkg/apis/workflow/v1alpha1"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	endpoints "github.com/aws/smithy-go/endpoints"
	"golang.org/x/net/context"
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

func upload(ctx context.Context, source string, key string, cfg Config, awsConfig aws.Config) error {
	file, err := os.Open(source)
	if err != nil {
		return err
	}
	defer file.Close()

	client := s3.NewFromConfig(awsConfig, func(o *s3.Options) {
		o.EndpointResolverV2 = &Endpoint{Bucket: BUCKET, S3Port: cfg.Local.BucketPort}
	})

	params := &s3.PutObjectInput{
		Bucket: aws.String(BUCKET),
		Key:    aws.String(key),
		Body:   file,
	}

	if _, err := client.PutObject(ctx, params); err != nil {
		return err
	}

	return nil
}

func tarFile(source string, key string, files bool) error {
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

		if files {
			sourceName := strings.TrimPrefix(source, "." + string(filepath.Separator))
			header.Name = strings.TrimPrefix(strings.Replace(path, sourceName, "files", -1), string(filepath.Separator))
		} else {
			header.Name = strings.TrimPrefix(strings.Replace(path, source, "", -1), string(filepath.Separator))
		}
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
	return nil
}

func tarUpload(ctx context.Context, source string, key string, files bool, cfg Config, awsConfig aws.Config) error {
	if err := tarFile(source, key, files); err != nil {
		return err
	}
	defer os.Remove(key)

	if err := upload(ctx, key, key, cfg, awsConfig); err != nil {
		return err
	}

	return nil
}

func tarDownload(ctx context.Context, sink string, key string, cfg Config, awsConfig aws.Config) error {
	client := s3.NewFromConfig(awsConfig, func(o *s3.Options) {
		o.EndpointResolverV2 = &Endpoint{Bucket: BUCKET, S3Port: cfg.Local.BucketPort}
	})

	result, err := client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(BUCKET),
		Key:    aws.String(key),
	})

	if err != nil {
		return err
	}

	defer result.Body.Close()

	gzr, err := gzip.NewReader(result.Body)

	if err != nil {
		return err
	}

	defer gzr.Close()

	tr := tar.NewReader(gzr)

	for {
		header, err := tr.Next()

		switch {
		case err == io.EOF:
			return nil
		case err != nil:
			return err
		case header == nil:
			continue
		}

		target := filepath.Join(sink, header.Name)
		if !fs.ValidPath(target) {
			return errors.New("invalid path: " + target)
		}

		switch header.Typeflag {
		case tar.TypeDir:
			if _, err := os.Stat(target); err != nil {
				if err := os.Mkdir(target, 0755); err != nil {
					return err
				}
			}

		case tar.TypeReg:
			file, err := os.OpenFile(target, os.O_CREATE|os.O_RDWR, os.FileMode(header.Mode))
			if err != nil {
				return err
			}

			if _, err := io.Copy(file, tr); err != nil {
				return err
			}

			file.Close()
		}

	}
}

func buildHistory(sinkPath string) error {
	if err := os.Mkdir(sinkPath, 0755); err != nil {
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
			block.Events.Inputs = []string{}
			block.Events.Outputs = []string{}
			for _, parameter := range node.Inputs.Parameters {
				block.Events.Inputs = append(block.Events.Inputs, string(parameter.Name)+":"+string(*parameter.Value))
			}
			for _, parameter := range node.Outputs.Parameters {
				block.Events.Outputs = append(block.Events.Outputs, string(parameter.Name)+":"+string(*parameter.Value))
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

func streaming(ctx context.Context, sink string, name string, roomId string, client clientcmd.ClientConfig, hub *Hub) {
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
	stream, err := serviceClient.WorkflowLogs(ctx, &workflowpkg.WorkflowLogRequest{
		Namespace: namespace,
		Name:      name,
		LogOptions: &corev1.PodLogOptions{
			Container: "main", // TODO expand logs
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

		hub.Broadcast <- Message{
			RoomId:  roomId,
			Content: fmt.Sprintf("%s: %s", event.PodName, event.Content),
		}

		if _, ok := logMap[event.PodName]; ok {
			logMap[event.PodName] = append(logMap[event.PodName], event.Content)
		} else {
			logMap[event.PodName] = []string{event.Content}
		}
	}

	if sink != "" {
		for podname, logs := range logMap {
			path := filepath.Join(sink, "logs", podname+".log")
			if err := writeFile(path, strings.Join(logs, "\n")); err != nil {
				log.Printf("Log stream error; err=%v", err)
			}
		}
	}
}

func runArgo(ctx context.Context, workflow *wfv1.Workflow, sink string, id string, client clientcmd.ClientConfig, hub *Hub) (*wfv1.Workflow, error) {
	ctx, cli, err := apiclient.NewClientFromOpts(
		apiclient.Opts{
			ClientConfigSupplier: func() clientcmd.ClientConfig {
				return client
			},
			Context: ctx,
		},
	)

	if err != nil {
		return &wfv1.Workflow{}, err
	}

	namespace, _, err := client.Namespace()

	if err != nil {
		return &wfv1.Workflow{}, err
	}

	serviceClient := cli.NewWorkflowServiceClient()
	workflow, err = serviceClient.CreateWorkflow(ctx, &workflowpkg.WorkflowCreateRequest{
		Namespace: namespace,
		Workflow:  workflow,
	})

	if err != nil {
		return workflow, err
	}

	go streaming(ctx, sink, workflow.Name, id, client, hub)

	for {
		workflow, err = serviceClient.GetWorkflow(ctx, &workflowpkg.WorkflowGetRequest{
			Name:      workflow.Name,
			Namespace: namespace,
		})

		if err != nil {
			return workflow, err
		}

		hub.Broadcast <- Message{
			RoomId:  id,
			Content: string(workflow.Status.Phase),
		}

		if workflow.Status.Phase.Completed() {
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

func deleteFiles(ctx context.Context, files []string, cfg Config, awsConfig aws.Config) {
	client := s3.NewFromConfig(awsConfig, func(o *s3.Options) {
		o.EndpointResolverV2 = &Endpoint{Bucket: BUCKET, S3Port: cfg.Local.BucketPort}
	})
	for _, file := range files {
		params := &s3.DeleteObjectInput{
			Bucket: aws.String(BUCKET),
			Key:    aws.String(file),
		}
		client.DeleteObject(ctx, params)
	}
}

func local_execute(pipeline *zjson.Pipeline, cfg Config, awsConfig aws.Config, client clientcmd.ClientConfig, hub *Hub) {
	sink := filepath.Join(pipeline.Sink, pipeline.Id+"-"+time.Now().Format("2006-01-02T15-04-05.000"))
	ctx := context.Background()
	defer log.Printf("Completed")

	if err := hub.OpenRoom(pipeline.Id); err != nil {
		log.Printf("Failed to open log room; err=%v", err)
		return
	}
	defer hub.CloseRoom(pipeline.Id)

	if err := upload(ctx, cfg.EntrypointFile, cfg.EntrypointFile, cfg, awsConfig); err != nil { // should never fail
		log.Printf("Failed to upload entrypoint file; err=%v", err)
		return
	}

	if err := buildHistory(sink); err != nil {
		log.Printf("Failed to build history folder; err=%v", err)
		return
	}

	jsonData, err := json.MarshalIndent(pipeline, "", "  ")
	if err != nil {
		log.Printf("Invalid pipeline.json; err=%v", err)
		return
	}
	if err := writeFile(filepath.Join(sink, "pipeline", "pipeline.json"), string(jsonData)); err != nil {
		log.Printf("Failed to write pipeline.json; err=%v", err)
		return
	}

	workflow, blocks, err := translate(ctx, pipeline, "org", cfg)
	if err != nil {
		log.Printf("Failed to translate the pipeline; err=%v", err)
		return
	}

	log.Printf("Made it after translate")
	jsonWorkflow, err := json.MarshalIndent(&workflow, "", "  ")
	if err != nil {
		log.Printf("Invalid translated pipeline.json; err=%v", err)
		return
	}

	if err := writeFile(filepath.Join(sink, "pipeline.json"), string(jsonWorkflow)); err != nil {
		log.Printf("Failed to write translated pipeline.json; err=%v", err)
		return
	}

	if err := tarUpload(ctx, pipeline.Source, "files.tar.gz", true, cfg, awsConfig); err != nil {
		log.Printf("Failed to upload files; err=%v", err)
		return
	}

	uploadedFiles := []string{"files.tar.gz"}
	for path, image := range blocks {
		log.Printf("Path: %v", path)
		log.Printf("Image: %v", image)
		if _, err := os.Stat(filepath.Join(path, cfg.ComputationFile)); err != nil {
			deleteFiles(ctx, uploadedFiles, cfg, awsConfig)
			log.Printf("Computation file does not exist; err=%v", err)
			return
		}

		if len(image) > 0 {
			key := image + "-build.tar.gz"
			if err := tarUpload(ctx, path, key, false, cfg, awsConfig); err != nil {
				deleteFiles(ctx, uploadedFiles, cfg, awsConfig)
				log.Printf("Failed to upload build context; err=%v", err)
				return
			}
			uploadedFiles = append(uploadedFiles, key)
		}

		name := filepath.Base(path) + ".py"
		if err := upload(ctx, filepath.Join(path, cfg.ComputationFile), name, cfg, awsConfig); err != nil {
			deleteFiles(ctx, uploadedFiles, cfg, awsConfig)
			log.Printf("Failed to upload computation file; err=%v", err)
			return
		}
		uploadedFiles = append(uploadedFiles, name)
	}

	workflow, err = runArgo(ctx, workflow, sink, pipeline.Id, client, hub)
	defer deleteArgo(ctx, workflow.Name, client)
	if err != nil {
		deleteFiles(ctx, uploadedFiles, cfg, awsConfig)
		log.Printf("Error during pipeline execution; err=%v", err)
		return
	}

	if err := results(filepath.Join(sink, "results", "results.json"), pipeline, workflow); err != nil {
		deleteFiles(ctx, uploadedFiles, cfg, awsConfig)
		log.Printf("Failed to download results; err=%v", err)
		return
	}

	if err := tarDownload(ctx, sink, "files.tar.gz", cfg, awsConfig); err != nil {
		deleteFiles(ctx, uploadedFiles, cfg, awsConfig)
		log.Printf("Failed to download files; err=%v", err)
		return
	}

	deleteFiles(ctx, uploadedFiles, cfg, awsConfig)
}

func cloud_execute(pipeline *zjson.Pipeline, cfg Config, client clientcmd.ClientConfig, hub *Hub) {
	ctx := context.Background()
	defer log.Printf("Completed")

	if err := hub.OpenRoom(pipeline.Id); err != nil {
		log.Printf("Failed to open log room; err=%v", err)
		return
	}
	defer hub.CloseRoom(pipeline.Id)

	workflow, _, err := translate(ctx, pipeline, "org", cfg)
	if err != nil {
		log.Printf("Failed to translate the pipeline; err=%v", err)
		return
	}

	workflow, err = runArgo(ctx, workflow, "", pipeline.Id, client, hub)
	defer deleteArgo(ctx, workflow.Name, client)
	if err != nil {
		log.Printf("Error during pipeline execution; err=%v", err)
		return
	}
}
