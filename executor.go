package main

import (
	"archive/tar"
	"compress/gzip"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"server/iargo"
	"server/oargo"
	"server/zjson"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	endpoints "github.com/aws/smithy-go/endpoints"
	"github.com/go-cmd/cmd"
	"golang.org/x/net/context"
	"gopkg.in/yaml.v3"
)

type Image struct {
	Repository string `json:"Repository"`
	Version    string `json:"Tag"`
}

func (image *Image) Name() string {
	return image.Repository + ":" + image.Version
}

type Endpoint struct {
	Bucket string
	S3Port string
}

func (endpoint *Endpoint) ResolveEndpoint(ctx context.Context, params s3.EndpointParameters) (endpoints.Endpoint, error) {
	uri, err := url.Parse("http://localhost:" + endpoint.S3Port + "/" + endpoint.Bucket)
	return endpoints.Endpoint{URI: *uri}, err
}

func upload(source string, key string, cfg Config, awsConfig aws.Config) error {
	file, err := os.Open(source)
	if err != nil {
		return err
	}
	defer file.Close()

	client := s3.NewFromConfig(awsConfig, func(o *s3.Options) {
		o.EndpointResolverV2 = &Endpoint{Bucket: cfg.Bucket, S3Port: cfg.S3Port}
	})

	params := &s3.PutObjectInput{
		Bucket: aws.String(cfg.Bucket),
		Key:    aws.String(key),
		Body:   file,
	}

	if _, err := client.PutObject(context.TODO(), params); err != nil {
		return err
	}

	return nil
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

		sourceName := strings.TrimPrefix(source, "."+string(filepath.Separator))
		header.Name = strings.TrimPrefix(strings.Replace(path, sourceName, "files", -1), string(filepath.Separator))
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

func tarUpload(source string, key string, cfg Config, awsConfig aws.Config) error {
	if err := tarFile(source, key); err != nil {
		return err
	}
	defer os.Remove(key)

	if err := upload(key, key, cfg, awsConfig); err != nil {
		return err
	}

	return nil
}

func tarDownload(sink string, key string, cfg Config, awsConfig aws.Config) error {
	client := s3.NewFromConfig(awsConfig, func(o *s3.Options) {
		o.EndpointResolverV2 = &Endpoint{Bucket: cfg.Bucket, S3Port: cfg.S3Port}
	})

	result, err := client.GetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String(cfg.Bucket),
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

func blockTemplate(block zjson.Block, cfg Config) iargo.Template {
	var artifact []interface{}
	artifact = append(artifact, iargo.UncompressedArtifact{
		Name: "computations",
		Path: cfg.WorkDir + "/" + cfg.ComputationFile,
		S3:   iargo.Storage{Key: block.Action.Container.Image + ".py"},
	})
	artifact = append(artifact, iargo.UncompressedArtifact{
		Name: "entrypoint",
		Path: cfg.WorkDir + "/" + cfg.EntrypointFile,
		S3:   iargo.Storage{Key: cfg.EntrypointFile},
	})
	image := "localhost:" + cfg.RegistryPort + "/" + block.Action.Container.Image + ":" + block.Action.Container.Version
	return iargo.Template{
		Name: block.Information.Id,
		Container: iargo.Container{
			Image:           image,
			Command:         block.Action.Container.CommandLine,
			ImagePullPolicy: "IfNotPresent",
		},
		Inputs: iargo.Put{Artifacts: artifact},
	}
}

func kanikoTemplate(block zjson.Block, cfg Config) iargo.Template {
	name := block.Action.Container.Image + "-" + block.Action.Container.Version
	var artifact []interface{}
	artifact = append(artifact, iargo.UncompressedArtifact{
		Name: "context",
		Path: "/workspace/context.tar.gz",
		S3:   iargo.Storage{Key: name + "-build.tar.gz"},
	})
	return iargo.Template{
		Name: name + "-build",
		Container: iargo.Container{
			Image: cfg.KanikoImage,
			Command: []string{
				"/kaniko/executor",
				"--context",
				"tar:///workspace/context.tar.gz",
				"--destination",
				"registry:" + cfg.RegistryPort + "/" + block.Action.Container.Image + ":" + block.Action.Container.Version,
				"--insecure",
			},
		},
		Inputs: iargo.Put{Artifacts: artifact},
	}
}

func translate(pipeline zjson.Pipeline, cfg Config) (iargo.Workflow, map[string]string, error) {
	workflow := iargo.Workflow{
		ApiVersion: "argoproj.io/v1alpha1",
		Kind:       "Workflow",
		Metadata:   iargo.Metadata{GenerateName: pipeline.Id + "-"},
		Spec: iargo.Spec{
			ArtifactRepositoryRef: iargo.ArtifactRepository{
				ConfigMap: "zetane-repository",
				Key:       "default",
			},
			Entrypoint:         "DAG",
			ServiceAccountName: "executor",
		},
	}

	blocks := make(map[string]string)
	tasks := make(map[string]iargo.Task)
	templates := make(map[string]iargo.Template)
	for _, block := range pipeline.Pipeline {
		template := blockTemplate(block, cfg)
		task := iargo.Task{Name: template.Name, Template: template.Name}

		if len(block.Action.Container.Image) > 0 {
			kaniko := kanikoTemplate(block, cfg)
			pullCmd := cmd.NewCmd("docker", "image", "pull", template.Container.Image)
			<-pullCmd.Start()
			imageCmd := cmd.NewCmd("docker", "image", "ls", "--format", "json")
			<-imageCmd.Start()
			toBuild := true
			for _, img := range imageCmd.Status().Stdout {
				var image Image
				if err := json.Unmarshal([]byte(img), &image); err != nil {
					return workflow, blocks, err
				}
				if template.Container.Image == image.Name() {
					toBuild = false
					break
				}
			}

			blockPath := filepath.Join(pipeline.Build, pipeline.Id, block.Action.Container.Image)
			blocks[blockPath] = ""
			if toBuild {
				blocks[blockPath] = block.Action.Container.Image + "-" + block.Action.Container.Version
				templates[kaniko.Name] = kaniko
				tasks[kaniko.Name] = iargo.Task{Name: kaniko.Name, Template: kaniko.Name}
				task.Dependencies = append(task.Dependencies, kaniko.Name)
			}
		}

		inputFile := false
		outputFile := false
		for name, input := range block.Inputs {
			if input.Type == "file" || input.Type == "List[file]" {
				inputFile = true
			}
			if len(input.Connections) > 0 {
				if len(input.Connections) == 1 {
					connection := input.Connections[0]
					inputBlock := pipeline.Pipeline[connection.Block]
					param, ok := inputBlock.Action.Parameters[connection.Variable]
					if ok {
						template.Container.Env = append(template.Container.Env, iargo.EnvVar{
							Name:  name,
							Value: param.Value,
						})
					} else {
						template.Container.Env = append(template.Container.Env, iargo.EnvVar{
							Name:  name,
							Value: "{{inputs.parameters." + name + "}}",
						})
						template.Inputs.Parameters = append(template.Inputs.Parameters, iargo.Parameter{
							Name: name,
						})
						inputNodeName := inputBlock.Information.Id
						task.Dependencies = append(task.Dependencies, inputNodeName)
						path := "{{tasks." + inputNodeName + ".outputs.parameters." + connection.Variable + "}}"
						task.Argument.Parameters = append(task.Argument.Parameters, iargo.Parameter{
							Name:  name,
							Value: path,
						})
					}
				} else {
					// TODO
					return workflow, blocks, errors.New("unsupported multiple inputs")
				}
			}
		}

		for name, output := range block.Outputs {
			if output.Type == "file" || output.Type == "List[file]" {
				outputFile = true
			}
			if len(output.Connections) > 0 {
				template.Outputs.Parameters = append(template.Outputs.Parameters, iargo.Parameter{
					Name:      name,
					ValueFrom: iargo.ValueFrom{Path: name + ".txt"},
				})
			}
		}

		if inputFile {
			template.Inputs.Artifacts = append(template.Inputs.Artifacts, iargo.Artifact{
				Name: "in",
				Path: cfg.FileDir,
				S3:   iargo.Storage{Key: "files.tar.gz"},
			})
		}
		if outputFile {
			template.Outputs.Artifacts = append(template.Outputs.Artifacts, iargo.Artifact{
				Name: "out",
				Path: cfg.FileDir,
				S3:   iargo.Storage{Key: "files.tar.gz"},
			})
		}

		tasks[task.Name] = task
		templates[template.Name] = template
	}

	dag := iargo.Template{Name: "DAG"}

	for _, template := range templates {
		if len(template.Container.Command) > 0 {
			workflow.Spec.Templates = append(workflow.Spec.Templates, template)
		}
	}

	for name, task := range tasks {
		if len(templates[name].Container.Command) > 0 {
			dag.DAG.Tasks = append(dag.DAG.Tasks, task)
		}
	}

	workflow.Spec.Templates = append(workflow.Spec.Templates, dag)

	return workflow, blocks, nil
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

func results(path string, pipeline zjson.Pipeline, workflow oargo.Workflow) error {
	for _, node := range workflow.Status.Nodes {
		if node.Type == "Pod" {
			block := pipeline.Pipeline[node.Template]
			block.Events.Inputs = []string{}
			block.Events.Outputs = []string{}
			for _, parameter := range node.Input.Parameters {
				block.Events.Inputs = append(block.Events.Inputs, parameter.Name+":"+parameter.Value)
			}
			for _, parameter := range node.Output.Parameters {
				block.Events.Outputs = append(block.Events.Outputs, parameter.Name+":"+parameter.Value)
			}
			pipeline.Pipeline[node.Template] = block
		}
	}

	data, err := json.MarshalIndent(pipeline, "", "  ")
	if err != nil {
		return err
	}

	return writeFile(path, string(data))
}

func logs(sink string, workflow oargo.Workflow) error {
	for name, node := range workflow.Status.Nodes {
		if node.Type == "Pod" {
			nameSplit := strings.Split(name, "-")
			nameLen := len(nameSplit)
			nameSplit = append(nameSplit, nameSplit[nameLen-1])
			nameSplit[nameLen-1] = node.Template
			podName := strings.Join(nameSplit, "-")
			logCmd := cmd.NewCmd("argo", "logs", workflow.Metadata.Name, podName)
			<-logCmd.Start()
			logs := strings.Join(logCmd.Status().Stdout, "\n")
			path := filepath.Join(sink, "logs", node.Template+".log")
			if err := writeFile(path, logs); err != nil {
				return err
			}
		}
	}
	return nil
}

func runArgo(sink string, pipeline zjson.Pipeline, hub *Hub, cfg Config) (oargo.Workflow, error) {
	var workflow oargo.Workflow
	exeCmd := cmd.NewCmd(cfg.ArgoPath, "submit", filepath.Join(sink, "pipeline.yml"), "--output", "json")
	<-exeCmd.Start()

	if len(exeCmd.Status().Stdout) == 0 {
		log.Printf("Executing workflow")
		return workflow, errors.New(strings.Join(exeCmd.Status().Stderr, "\n"))
	}
	jsonData := strings.Join(exeCmd.Status().Stdout, "\n")
	if err := json.Unmarshal([]byte(jsonData), &workflow); err != nil {
		log.Printf("Unmarshalling jsondata")
		return workflow, err
	}

	for {
		getCmd := cmd.NewCmd(cfg.ArgoPath, "get", workflow.Metadata.Name, "--output", "json")
		<-getCmd.Start()
		jsonData = strings.Join(getCmd.Status().Stdout, "\n")
		if err := json.Unmarshal([]byte(jsonData), &workflow); err != nil {
			return workflow, err
		}

		for name, node := range workflow.Status.Nodes {
			if node.Type == "Pod" {
				nameSplit := strings.Split(name, "-")
				nameLen := len(nameSplit)
				nameSplit = append(nameSplit, nameSplit[nameLen-1])
				nameSplit[nameLen-1] = node.Template
				podName := strings.Join(nameSplit, "-")
				logCmd := cmd.NewCmd("argo", "logs", workflow.Metadata.Name, podName)
				<-logCmd.Start()
				logs := strings.Join(logCmd.Status().Stdout, "\n")
				if len(logs) > 0 {
					hub.Broadcast <- Message{
						RoomId:  pipeline.Id,
						Content: logs,
					}
				}

			}
		}

		hub.Broadcast <- Message{
			RoomId:  pipeline.Id,
			Content: workflow.Status.Phase,
		}

		if workflow.Status.Phase != "Running" {
			break
		}
		time.Sleep(time.Second * 10)
	}

	return workflow, nil
}

func deleteArgo(workflow oargo.Workflow, cfg Config) {
	if len(workflow.Metadata.Name) == 0 {
		delCmd := cmd.NewCmd(cfg.ArgoPath, "delete", "@latest")
		<-delCmd.Start()
	} else {
		delCmd := cmd.NewCmd(cfg.ArgoPath, "delete", workflow.Metadata.Name)
		<-delCmd.Start()
	}
}

func deleteFiles(files []string, cfg Config, awsConfig aws.Config) {
	client := s3.NewFromConfig(awsConfig, func(o *s3.Options) {
		o.EndpointResolverV2 = &Endpoint{Bucket: cfg.Bucket, S3Port: cfg.S3Port}
	})
	for _, file := range files {
		params := &s3.DeleteObjectInput{
			Bucket: aws.String(cfg.Bucket),
			Key:    aws.String(file),
		}
		client.DeleteObject(context.TODO(), params)
	}
}

func execute(pipeline zjson.Pipeline, cfg Config, awsConfig aws.Config, hub *Hub) {
	sink := filepath.Join(pipeline.Sink, pipeline.Id+"-"+time.Now().Format("2006-01-02T15-04-05.000"))
	defer log.Printf("Completed")

	if _, ok := hub.Clients[pipeline.Id]; ok {
		log.Printf("Pipeline already exists")
		return
	}

	hub.Clients[pipeline.Id] = make(map[*Client]bool)
	defer hub.CloseRoom(pipeline.Id)

	if err := upload(cfg.EntrypointFile, cfg.EntrypointFile, cfg, awsConfig); err != nil { // should never fail
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

	workflow, blocks, err := translate(pipeline, cfg)
	if err != nil {
		log.Printf("Failed to translate the pipeline; err=%v", err)
		return
	}
	log.Printf("Made it after translate")
	yml, err := yaml.Marshal(&workflow)
	if err != nil {
		log.Printf("Invalid pipeline.yml; err=%v", err)
		return
	}
	if err := writeFile(filepath.Join(sink, "pipeline.yml"), string(yml)); err != nil {
		log.Printf("Failed to write pipeline.yml; err=%v", err)
		return
	}

	if err := tarUpload(pipeline.Source, "files.tar.gz", cfg, awsConfig); err != nil {
		log.Printf("Failed to upload files; err=%v", err)
		return
	}

	uploadedFiles := []string{"files.tar.gz"}
	for path, image := range blocks {
		log.Printf("Path: %v", path)
		log.Printf("Image: %v", image)
		if _, err := os.Stat(filepath.Join(path, cfg.ComputationFile)); err != nil {
			deleteFiles(uploadedFiles, cfg, awsConfig)
			log.Printf("Computation file does not exist; err=%v", err)
			return
		}

		output, err := runArgo(sink, pipeline, hub, cfg)
		defer deleteArgo(output, cfg)
		if err != nil {
			deleteFiles(uploadedFiles, cfg, awsConfig)
			log.Printf("Error during pipeline execution; err=%v", err)
			return
		}

		name := filepath.Base(path) + ".py"
		if err := upload(filepath.Join(path, cfg.ComputationFile), name, cfg, awsConfig); err != nil {
			deleteFiles(uploadedFiles, cfg, awsConfig)
			log.Printf("Failed to upload computation file; err=%v", err)
			return
		}
		uploadedFiles = append(uploadedFiles, name)
	}

	output, err := runArgo(sink, pipeline, hub, cfg)
	defer deleteArgo(output, cfg)
	if err != nil {
		log.Println(output)
		deleteFiles(uploadedFiles, cfg, awsConfig)
		log.Printf("Error during pipeline execution; err=%v", err)
		return
	}

	if err := results(filepath.Join(sink, "results", "results.json"), pipeline, output); err != nil {
		deleteFiles(uploadedFiles, cfg, awsConfig)
		log.Printf("Failed to download results; err=%v", err)
		return
	}

	if err := logs(sink, output); err != nil {
		deleteFiles(uploadedFiles, cfg, awsConfig)
		log.Printf("Failed to download logs; err=%v", err)
		return
	}

	if err := tarDownload(sink, "files.tar.gz", cfg, awsConfig); err != nil {
		deleteFiles(uploadedFiles, cfg, awsConfig)
		log.Printf("Failed to download files; err=%v", err)
		return
	}

	deleteFiles(uploadedFiles, cfg, awsConfig)
}
