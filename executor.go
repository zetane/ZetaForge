package main

import (
	"archive/tar"
	"bufio"
	"bytes"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"server/zjson"
	"strings"
	"time"

	"github.com/argoproj/argo-workflows/v3/pkg/apiclient"
	workflowpkg "github.com/argoproj/argo-workflows/v3/pkg/apiclient/workflow"
	wfv1 "github.com/argoproj/argo-workflows/v3/pkg/apis/workflow/v1alpha1"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/go-cmd/cmd"
	"golang.org/x/sync/errgroup"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/tools/clientcmd"
)

func uploadData(ctx context.Context, data string, key string, cfg Config) error {
	body := strings.NewReader(data)

	client, err := s3Client(ctx, cfg)
	if err != nil {
		return err
	}

	params := &s3.PutObjectInput{
		Bucket: aws.String(cfg.BucketName),
		Key:    aws.String(key),
		Body:   body,
	}

	_, err = client.PutObject(ctx, params)
	return err
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
		Bucket: aws.String(cfg.BucketName),
		Key:    aws.String(key),
		Body:   file,
	}

	_, err = client.PutObject(ctx, params)
	return err
}

func downloadFile(ctx context.Context, key string, filename string, cfg Config) error {
	client, err := s3Client(ctx, cfg)
	if err != nil {
		return err
	}

	result, err := client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(cfg.BucketName),
		Key:    &key,
	})

	if err != nil {
		return err
	}

	file, err := os.OpenFile(filepath.Join(filename), os.O_CREATE|os.O_RDWR, 0644)
	if err != nil {
		result.Body.Close()
		return err
	}

	if _, err := io.Copy(file, result.Body); err != nil {
		result.Body.Close()
		return err
	}

	result.Body.Close()

	return nil
}

func deleteFiles(ctx context.Context, prefix string, extraFiles []string, cfg Config) {
	client, err := s3Client(ctx, cfg)
	if err != nil {
		log.Printf("failed to delete files; err=%v", err)
		return
	}

	params := &s3.DeleteObjectsInput{
		Bucket: aws.String(cfg.BucketName),
		Delete: &s3types.Delete{
			Objects: []s3types.ObjectIdentifier{},
		},
	}

	res, err := client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(cfg.BucketName),
		Prefix: aws.String(prefix),
	})
	if err != nil {
		log.Printf("failed to delete files; err=%v", err)
	}

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
		log.Printf("failed to delete files; err=%v", err)
	}
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

func results(ctx context.Context, db *sql.DB, execution int64, pipeline zjson.Pipeline, workflow wfv1.Workflow) error {
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

	return updateExecutionResults(ctx, db, execution, pipeline)
}

func streaming(ctx context.Context, name string, logger *log.Logger, cfg Config) {
	client, err := kubernetesClient(cfg)
	if err != nil {
		logger.Printf("Log stream error; err=%v", err)
		return
	}
	ctx, cli, err := apiclient.NewClientFromOpts(
		apiclient.Opts{
			ClientConfigSupplier: func() clientcmd.ClientConfig {
				return client
			},
			Context: ctx,
		},
	)

	if err != nil {
		logger.Printf("log stream error; err=%v", err)
		return
	}

	namespace, _, err := client.Namespace()

	if err != nil {
		logger.Printf("log stream error; err=%v", err)
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
			logger.Printf("log stream error; err=%v", err)
			return
		}

		for {
			event, err := stream.Recv()

			if err == io.EOF {
				break
			} else if err != nil {
				logger.Printf("log stream error; err=%v", err)
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
				fmt.Println("invalid input string format")
			}
			jsonObj := map[string]interface{}{
				"blockId": blockId,
				"message": event.Content,
			}
			jsonData, err := json.Marshal(jsonObj)
			if err != nil {
				fmt.Printf("failed to cast log to JSON: %v", err)
			}

			// This writes stream output to log, mandatory
			logger.Printf("%s", jsonData)
		}
	}

	for _, container := range []string{"main"} {
		go containerStream(container)
	}
}

func runArgo(ctx context.Context, workflow *wfv1.Workflow, execution int64, cfg Config, db *sql.DB, logger *log.Logger, hub *Hub) (*wfv1.Workflow, error) {
	//mixpanelClient is singleton, so a new instance won't be created.
	mixpanelClient := GetMixpanelClient()

	client, err := kubernetesClient(cfg)
	if err != nil {
		return nil, err
	}

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

	workflow, err = cli.NewWorkflowServiceClient().CreateWorkflow(ctx, &workflowpkg.WorkflowCreateRequest{
		Namespace: namespace,
		Workflow:  workflow,
	})

	if err != nil {
		return workflow, err
	}

	if err := addExecutionWorkflow(ctx, db, execution, workflow.Name); err != nil {
		logger.Printf("failed to write workflow id to database; err=%v", err)
		return workflow, err
	}

	// streams to websocket
	go streaming(ctx, workflow.Name, logger, cfg)
	status := string(workflow.Status.Phase)

	for {
		client, err = kubernetesClient(cfg)
		if err != nil {
			return workflow, err
		}

		_, cli, err = apiclient.NewClientFromOpts(
			apiclient.Opts{
				ClientConfigSupplier: func() clientcmd.ClientConfig {
					return client
				},
				Context: ctx,
			},
		)

		if err != nil {
			return workflow, err
		}

		workflow, err = cli.NewWorkflowServiceClient().GetWorkflow(ctx, &workflowpkg.WorkflowGetRequest{
			Name:      workflow.Name,
			Namespace: namespace,
		})

		if err != nil {
			return workflow, err
		}

		if string(workflow.Status.Phase) != status {
			status = string(workflow.Status.Phase)
			updateExecutionStatus(ctx, db, execution, status)
			logger.Printf("Status Updated: %s", status)
		} else {
			fmt.Printf(".")
		}

		if workflow.Status.Phase.Completed() {
			logger.Printf("Status: Completed")
			mixpanelClient.TrackEvent(ctx, "Run Completed", map[string]any{})
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

func deleteArgo(ctx context.Context, name string, cfg Config) {
	client, err := kubernetesClient(cfg)
	if err != nil {
		log.Printf("Failed to delete workflow %s; err=%v", name, err)
		return
	}

	ctx, cli, err := apiclient.NewClientFromOpts(
		apiclient.Opts{
			ClientConfigSupplier: func() clientcmd.ClientConfig {
				return client
			},
			Context: ctx,
		},
	)

	if err != nil {
		log.Printf("failed to delete workflow %s; err=%v", name, err)
		return
	}

	namespace, _, err := client.Namespace()

	if err != nil {
		log.Printf("failed to delete workflow %s; err=%v", name, err)
		return
	}

	serviceClient := cli.NewWorkflowServiceClient()
	_, err = serviceClient.DeleteWorkflow(ctx, &workflowpkg.WorkflowDeleteRequest{
		Name:      name,
		Namespace: namespace,
		Force:     false,
	})

	if err != nil {
		log.Printf("failed to delete workflow %s; err=%v", name, err)
	}
}

func stopArgo(ctx context.Context, name string, cfg Config) error {
	client, err := kubernetesClient(cfg)
	if err != nil {
		log.Printf("Failed to stop workflow %s; err=%v", name, err)
		return err
	}

	ctx, cli, err := apiclient.NewClientFromOpts(
		apiclient.Opts{
			ClientConfigSupplier: func() clientcmd.ClientConfig {
				return client
			},
			Context: ctx,
		},
	)

	if err != nil {
		log.Printf("failed to build an api client; err=%v", err)
		return err
	}

	namespace, _, err := client.Namespace()

	if err != nil {
		log.Printf("failed to stop workflow %s; err=%v", name, err)
		return err
	}

	serviceClient := cli.NewWorkflowServiceClient()
	_, err = serviceClient.StopWorkflow(ctx, &workflowpkg.WorkflowStopRequest{
		Name:      name,
		Namespace: namespace,
	})

	if err != nil {
		log.Printf("failed to stop workflow %s; err=%v", name, err)
		return err
	}

	return nil
}

func terminateArgo(ctx context.Context, cfg Config, db *sql.DB, name string, id int64) error {
	client, err := kubernetesClient(cfg)
	if err != nil {
		log.Printf("Failed to get kubernetes client: %s; err=%v", name, err)
		return err
	}

	ctx, cli, err := apiclient.NewClientFromOpts(
		apiclient.Opts{
			ClientConfigSupplier: func() clientcmd.ClientConfig {
				return client
			},
			Context: ctx,
		},
	)
	if err != nil {
		log.Printf("failed to build an api client; err=%v", err)
		return err
	}

	namespace, _, err := client.Namespace()
	if err != nil {
		log.Printf("failed to stop workflow %s; err=%v", name, err)
		return err
	}

	serviceClient := cli.NewWorkflowServiceClient()
	wf, err := serviceClient.GetWorkflow(ctx, &workflowpkg.WorkflowGetRequest{
		Name:      name,
		Namespace: namespace,
	})
	if err != nil {
		log.Printf("failed to get workflow %s; err=%v", name, err)
		updateErr := updateExecutionStatus(ctx, db, id, "Failed")

		if updateErr != nil {
			log.Printf("failed to update execution status for workflow %s; err=%v", name, updateErr)
			return updateErr
		}

		log.Printf("terminated workflow %s", name)

		return err
	}

	if wf.Status.Phase == "Running" || wf.Status.Phase == "Pending" {
		_, err = serviceClient.TerminateWorkflow(ctx, &workflowpkg.WorkflowTerminateRequest{
			Name:      name,
			Namespace: namespace,
		})
		if err != nil {
			log.Printf("failed to stop workflow %s; err=%v", name, err)
			return err
		}
	}

	err = updateExecutionStatus(ctx, db, id, "Failed")
	if err != nil {
		log.Printf("failed to update execution status for workflow %s; err=%v", name, err)
		return err
	}

	return nil
}

func buildImage(ctx context.Context, source string, tag string, logger *log.Logger, cfg Config) error {
	if cfg.Local.Driver == "minikube" {
		minikubeBuild := cmd.NewCmd("minikube", "-p", "zetaforge", "image", "build", "-t", tag, source)
		minikubeChan := minikubeBuild.Start()
		lineCount := 0
		done := false

		for {
			select {
			case <-minikubeChan:
				done = true
			default:
				output := minikubeBuild.Status().Stderr
				if len(output) > lineCount {
					for i := 0; i < len(output)-lineCount; i++ {
						logger.Println(output[lineCount+i])
					}
					lineCount = len(output)
				}
			}
			if done {
				break
			}
		}

		output := minikubeBuild.Status().Stderr
		if len(output) > lineCount {
			for i := 0; i < len(output)-lineCount; i++ {
				logger.Println(output[lineCount+i])
			}
		}

		minikubeImage := cmd.NewCmd("minikube", "-p", "zetaforge", "image", "ls")
		<-minikubeImage.Start()
		for _, line := range minikubeImage.Status().Stdout {
			if "docker.io/"+tag == line {
				return nil
			}
		}

		return errors.New("Failed to build image: " + tag)
	} else {
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

		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			var message map[string]interface{}
			if err := json.Unmarshal(scanner.Bytes(), &message); err != nil {
				return err
			}

			if stream, ok := message["stream"].(string); ok {
				logger.Printf("%s", stream)
			} else if errorDetail, ok := message["errorDetail"].(map[string]interface{}); ok {
				logger.Printf("Docker build error: %v", errorDetail["message"])
			}
		}
	}

	return nil
}

func localExecute(pipeline *zjson.Pipeline, pipelineMerkleTree *zjson.PipelineMerkleTree, executionId int64, executionUuid string, organization string, build bool, deployed bool, cfg Config, db *sql.DB, hub *Hub) {
	ctx := context.Background()
	defer log.Printf("Completed")

	defer completeExecution(ctx, db, executionId)

	if err := hub.OpenRoom(executionUuid); err != nil {
		log.Printf("failed to open log room; err=%v", err)
		return
	}
	defer hub.CloseRoom(executionUuid)

	if err := upload(ctx, cfg.EntrypointFile, cfg.EntrypointFile, cfg); err != nil { // should never fail
		log.Printf("failed to upload entrypoint file; err=%v", err)
		return
	}

	tempLog := filepath.Join(os.TempDir(), executionUuid+".log")
	s3Key := pipeline.Id + "/" + executionUuid
	log.Printf("Writing to %s", tempLog)

	pipelineLogger, closer, err := createLogger(executionUuid, processLogMessage, hub)
	if err != nil {
		log.Printf("error creating pipeline logger: %v", err)
	}
	defer closer.Close()

	jsonData, err := json.MarshalIndent(pipeline, "", "  ")
	if err != nil {
		log.Printf("invalid pipeline.json; err=%v", err)
		return
	}
	if err := uploadData(ctx, string(jsonData), s3Key+"/"+"pipeline.json", cfg); err != nil {
		log.Printf("failed to write pipeline.json; err=%v", err)
		return
	}

	workflow, blocks, err := translate(ctx, pipeline, pipelineMerkleTree, organization, s3Key, executionUuid, build, deployed, cfg)
	if err != nil {
		log.Printf("failed to translate the pipeline; err=%v", err)
		return
	}

	defer cleanupRun(ctx, db, executionId, executionUuid, tempLog, s3Key, *pipeline, *workflow, cfg)

	jsonWorkflow, err := json.MarshalIndent(&workflow, "", "  ")
	if err != nil {
		log.Printf("invalid translated pipeline.json; err=%v", err)
		return
	}

	if err := uploadData(ctx, string(jsonWorkflow), s3Key+"/"+"argo.json", cfg); err != nil {
		log.Printf("failed to write translated pipeline.json; err=%v", err)
		return
	}

	if err := updateExecutionJson(ctx, db, executionId, workflow); err != nil {
		log.Printf("failed to write workflow to database; err=%v", err)
		return
	}

	eg, egCtx := errgroup.WithContext(ctx)
	eg.SetLimit(runtime.NumCPU())

	for path, image := range blocks {
		// Duplicate variables -> https://pkg.go.dev/golang.org/x/tools/go/analysis/passes/loopclosure
		path := path
		image := image

		if len(image) > 0 {
			eg.Go(func() error {
				return buildImage(egCtx, path, image, pipelineLogger, cfg)
			})
		}
	}

	if cfg.Local.Driver == "k3d" {
		imageImport := []string{"image", "import"}
		for _, image := range blocks {
			imageImport = append(imageImport, image)
		}
		imageImport = append(imageImport, "-c")
		imageImport = append(imageImport, cfg.Local.K3DCluster)
		pullImage := cmd.NewCmd("k3d", imageImport...)
		<-pullImage.Start()
		log.Println(pullImage.Status().Stdout)
		log.Println(pullImage.Status().Stderr)
	}

	if err := eg.Wait(); err != nil {
		pipelineLogger.Printf("error during pipeline build execution; err=%v", err)
		log.Printf("error during pipeline build execution; err=%v", err)
		return
	}

	workflow, err = runArgo(ctx, workflow, executionId, cfg, db, pipelineLogger, hub)
	if workflow != nil {
		defer deleteArgo(ctx, workflow.Name, cfg)
	}
	if err != nil {
		pipelineLogger.Printf("error during pipeline run execution; err=%v", err)
		log.Printf("error during pipeline run execution; err=%v", err)
		return
	}
	// needs to be called here in addition to in defer
	// in defer, it seems the nodes go out of scope
	if err := results(ctx, db, executionId, *pipeline, *workflow); err != nil {
		log.Printf("failed to save results; err=%v", err)
	}
}

func cleanupRun(ctx context.Context, db *sql.DB, executionId int64, executionUuid string, tempLog string, s3Key string, pipeline zjson.Pipeline, workflow wfv1.Workflow, cfg Config) {
	if err := upload(ctx, tempLog, s3Key+"/"+executionUuid+".log", cfg); err != nil {
		log.Printf("failed to upload log: err=%v", err)
	}

	if err := results(ctx, db, executionId, pipeline, workflow); err != nil {
		log.Printf("failed to save results; err=%v", err)
	}
}

func cloudExecute(pipeline *zjson.Pipeline, pipelineMerkleTree *zjson.PipelineMerkleTree, executionId int64, executionUuid string, organization string, build bool, deployed bool, cfg Config, db *sql.DB, hub *Hub) {
	ctx := context.Background()
	defer log.Printf("Completed")

	defer completeExecution(ctx, db, executionId)

	if err := hub.OpenRoom(executionUuid); err != nil {
		log.Printf("failed to open log room; err=%v", err)
		return
	}
	defer hub.CloseRoom(pipeline.Id)

	if cfg.Cloud.Provider == "Debug" {
		if err := upload(ctx, cfg.EntrypointFile, cfg.EntrypointFile, cfg); err != nil { // should never fail
			log.Printf("failed to upload entrypoint file; err=%v", err)
			return
		}
	}

	s3key := organization + "/" + pipeline.Id + "/" + executionUuid
	logDir, exists := os.LookupEnv("ZETAFORGE_LOGS")
	if !exists {
		logDir = os.TempDir()
	}
	tempLog := filepath.Join(logDir, executionUuid+".log")

	pipelineLogger, closer, err := createLogger(executionUuid, processLogMessage, hub)
	if err != nil {
		log.Printf("error creating pipeline logger: %v", err)
	}
	defer closer.Close()

	jsonData, err := json.MarshalIndent(pipeline, "", "  ")
	if err != nil {
		log.Printf("invalid pipeline.json; err=%v", err)
		return
	}
	if err := uploadData(ctx, string(jsonData), s3key+"/"+"pipeline.json", cfg); err != nil {
		log.Printf("failed to write pipeline.json; err=%v", err)
		return
	}

	workflow, _, err := translate(ctx, pipeline, pipelineMerkleTree, organization, s3key, executionUuid, build, deployed, cfg)
	if err != nil {
		log.Printf("failed to translate the pipeline; err=%v", err)
		return
	}

	defer cleanupRun(ctx, db, executionId, executionUuid, tempLog, s3key, *pipeline, *workflow, cfg)

	jsonWorkflow, err := json.MarshalIndent(&workflow, "", "  ")
	if err != nil {
		log.Printf("invalid translated pipeline.json; err=%v", err)
		return
	}

	if err := uploadData(ctx, string(jsonWorkflow), s3key+"/"+"argo.json", cfg); err != nil {
		log.Printf("failed to write translated pipeline.json; err=%v", err)
		return
	}

	if err := updateExecutionJson(ctx, db, executionId, workflow); err != nil {
		log.Printf("failed to write workflow to database; err=%v", err)
		return
	}

	workflow, err = runArgo(ctx, workflow, executionId, cfg, db, pipelineLogger, hub)
	if workflow != nil {
		defer deleteArgo(ctx, workflow.Name, cfg)
	}
	if err != nil {
		pipelineLogger.Printf("error during pipeline execution; err=%v", err)
		log.Printf("error during pipeline execution; err=%v", err)
		return
	}

	if err := results(ctx, db, executionId, *pipeline, *workflow); err != nil {
		log.Printf("failed to save results; err=%v", err)
	}
}

func getBuildContextStatus(ctx context.Context, pipeline *zjson.Pipeline, merkleTree *zjson.PipelineMerkleTree, rebuild bool, organization string, cfg Config) []zjson.BuildContextStatusResponse {
	var buildContextStatus []zjson.BuildContextStatusResponse
	for id, block := range pipeline.Pipeline {
		var hash = merkleTree.Blocks[id].Hash
		if len(block.Action.Container.Image) > 0 { // just to push local pipeline to clould change it to 'if len(block.Action.Container.Image) > 0 && !cfg.IsLocal {' afterwards.
			var status = false
			if !rebuild {
				imageStatus, _, err := checkImage(ctx, getImage(&block, hash, organization), cfg)
				if err != nil {
					log.Printf("failed to get build context status; err=%v", err)
					return buildContextStatus
				}
				status = imageStatus
			}

			s3Key := getKanikoBuildContextS3Key(&block, hash)

			buildContextStatus = append(buildContextStatus, zjson.BuildContextStatusResponse{
				BlockKey:   id,
				IsUploaded: status,
				S3Key:      s3Key,
			})
		} else {
			buildContextStatus = append(buildContextStatus, zjson.BuildContextStatusResponse{
				BlockKey:   id,
				IsUploaded: true,
				S3Key:      "",
			})
		}
	}
	return buildContextStatus
}
