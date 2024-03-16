package main

import (
	"context"
	"errors"
	"path/filepath"

	"server/zjson"

	wfv1 "github.com/argoproj/argo-workflows/v3/pkg/apis/workflow/v1alpha1"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/google/go-containerregistry/pkg/authn"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/v1/remote"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func checkImage(ctx context.Context, tagName string, cfg Config) (bool, error) {
	if cfg.IsLocal {
		apiClient, err := client.NewClientWithOpts(
			client.WithAPIVersionNegotiation(),
		)
		defer apiClient.Close()
		if err != nil {
			return true, err
		}

		imageList, err := apiClient.ImageList(ctx, types.ImageListOptions{})
		if err != nil {
			return true, err
		}

		for _, image := range imageList {
			for _, tag := range image.RepoTags {
				if tagName == tag {
					return false, nil
				}
			}

		}

		return true, nil

	} else {
		repo, err := name.NewRepository(cfg.Cloud.RegistryAddr)
		if err != nil {
			return true, err
		}

		auth := authn.FromConfig(
			authn.AuthConfig{
				Username: cfg.Cloud.RegistryUser,
				Password: cfg.Cloud.RegistryPass,
			},
		)

		data, err := remote.List(repo, remote.WithAuth(auth))

		if err != nil {
			return true, err
		}

		for _, tag := range data {
			if tagName == cfg.Cloud.RegistryAddr+":"+tag {
				return false, nil
			}
		}

		return true, nil
	}
}

func blockTemplate(block *zjson.Block, blockKey string, organization string, cfg Config) *wfv1.Template {
	var image string
	var computationName string
	if cfg.IsLocal {
		image = "localhost:" + cfg.Local.RegistryPort + "/" + block.Action.Container.Image + ":" + block.Action.Container.Version
		computationName = blockKey + ".py"

	} else {
		image = cfg.Cloud.RegistryAddr + ":" + organization + "-" + block.Action.Container.Image + "-" + block.Action.Container.Version
		computationName = organization + "-" + blockKey + ".py"
	}
	entrypoint := wfv1.Artifact{
		Name: "entrypoint",
		Path: cfg.WorkDir + "/" + cfg.EntrypointFile,
		ArtifactLocation: wfv1.ArtifactLocation{
			S3: &wfv1.S3Artifact{
				Key: cfg.EntrypointFile,
			},
		},
		Archive: &wfv1.ArchiveStrategy{
			None: &wfv1.NoneStrategy{},
		},
	}
	computations := wfv1.Artifact{
		Name: "computations",
		Path: cfg.WorkDir + "/" + cfg.ComputationFile,
		ArtifactLocation: wfv1.ArtifactLocation{
			S3: &wfv1.S3Artifact{
				Key: computationName,
			},
		},
		Archive: &wfv1.ArchiveStrategy{
			None: &wfv1.NoneStrategy{},
		},
	}
	idMap := make(map[string]string)
	idMap["key"] = blockKey
	return &wfv1.Template{
		Name: blockKey,
		Container: &corev1.Container{
			Image:           image,
			Command:         block.Action.Container.CommandLine,
			ImagePullPolicy: "IfNotPresent",
		},
		Inputs:   wfv1.Inputs{Artifacts: []wfv1.Artifact{entrypoint, computations}},
		Metadata: wfv1.Metadata{Annotations: idMap},
	}
}

func kanikoTemplate(block *zjson.Block, organization string, cfg Config) *wfv1.Template {
	if cfg.IsLocal {
		name := block.Action.Container.Image + "-" + block.Action.Container.Version
		cmd := []string{
			"/kaniko/executor",
			"--context",
			"tar:///workspace/context.tar.gz",
			"--destination",
			"registry:" + cfg.Local.RegistryPort + "/" + block.Action.Container.Image + ":" + block.Action.Container.Version,
			"--insecure",
			"--cache=true",
			"--cache-dir=/cache",
			"--compressed-caching=false",
			"--snapshotMode=redo",
			"--use-new-run",
		}
		artifact := wfv1.Artifact{
			Name: "context",
			Path: "/workspace/context.tar.gz",
			ArtifactLocation: wfv1.ArtifactLocation{
				S3: &wfv1.S3Artifact{
					Key: name + "-build.tar.gz",
				},
			},
			Archive: &wfv1.ArchiveStrategy{
				None: &wfv1.NoneStrategy{},
			},
		}
		return &wfv1.Template{
			Name: name + "-build",
			Container: &corev1.Container{
				Image:   cfg.KanikoImage,
				Command: cmd,
			},
			Inputs: wfv1.Inputs{Artifacts: []wfv1.Artifact{artifact}},
		}
	} else {
		name := organization + "-" + block.Action.Container.Image + "-" + block.Action.Container.Version
		cmd := []string{
			"/kaniko/executor",
			"--context",
			"tar:///workspace/context.tar.gz",
			"--destination",
			cfg.Cloud.RegistryAddr + ":" + name,
			"--cache=true",
			"--cache-dir=/cache",
			"--compressed-caching=false",
			"--snapshotMode=redo",
			"--use-new-run",
		}
		return &wfv1.Template{
			Name: name + "-build",
			Container: &corev1.Container{
				Image:   cfg.KanikoImage,
				Command: cmd,
				VolumeMounts: []corev1.VolumeMount{
					{
						Name:      "kaniko-secret",
						MountPath: "/kaniko/.docker",
					},
				},
			},
			Inputs: wfv1.Inputs{Artifacts: []wfv1.Artifact{
				{
					Name: "context",
					Path: "/workspace/context.tar.gz",
					ArtifactLocation: wfv1.ArtifactLocation{
						S3: &wfv1.S3Artifact{
							Key: name + "-build.tar.gz",
						},
					},
					Archive: &wfv1.ArchiveStrategy{
						None: &wfv1.NoneStrategy{},
					},
				},
			}},
			Volumes: []corev1.Volume{
				{
					Name: "kaniko-secret",
					VolumeSource: corev1.VolumeSource{
						Secret: &corev1.SecretVolumeSource{
							SecretName: cfg.Cloud.Registry,
							Items: []corev1.KeyToPath{
								{
									Key:  ".dockerconfigjson",
									Path: "config.json",
								},
							},
						},
					},
				},
			},
		}
	}

}

func translate(ctx context.Context, pipeline *zjson.Pipeline, organization string, cfg Config) (*wfv1.Workflow, map[string]string, error) {
	workflow := wfv1.Workflow{
		TypeMeta: metav1.TypeMeta{
			Kind:       "Workflow",
			APIVersion: "argoproj.io/v1alpha1",
		},
		ObjectMeta: metav1.ObjectMeta{
			GenerateName:      pipeline.Id + "-",
			CreationTimestamp: metav1.Now(),
		},
		Spec: wfv1.WorkflowSpec{
			ArtifactRepositoryRef: &wfv1.ArtifactRepositoryRef{
				ConfigMap: cfg.Bucket,
				Key:       "default",
			},
			Entrypoint:         "DAG",
			ServiceAccountName: cfg.ServiceAccount,
		},
	}

	blocks := make(map[string]string)
	tasks := make(map[string]*wfv1.DAGTask)
	templates := make(map[string]*wfv1.Template)
	for id, block := range pipeline.Pipeline {
		blockKey := id
		template := blockTemplate(&block, blockKey, organization, cfg)
		task := wfv1.DAGTask{Name: template.Name, Template: template.Name}

		if len(block.Action.Container.Image) > 0 {
			kaniko := kanikoTemplate(&block, organization, cfg)
			toBuild, err := checkImage(ctx, template.Container.Image, cfg)
			if err != nil {
				return &workflow, blocks, err
			}

			blockPath := filepath.Join(pipeline.Build, blockKey)
			blocks[blockPath] = ""
			if toBuild {
				blocks[blockPath] = block.Action.Container.Image + "-" + block.Action.Container.Version
				templates[kaniko.Name] = kaniko
				tasks[kaniko.Name] = &wfv1.DAGTask{Name: kaniko.Name, Template: kaniko.Name}
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
					// Parameter is in the graph
					if ok {
						template.Container.Env = append(template.Container.Env, corev1.EnvVar{
							Name:  name,
							Value: param.Value,
						})
					} else {
						template.Container.Env = append(template.Container.Env, corev1.EnvVar{
							Name:  name,
							Value: "{{inputs.parameters." + name + "}}",
						})
						template.Inputs.Parameters = append(template.Inputs.Parameters, wfv1.Parameter{
							Name: name,
						})
						inputNodeName := connection.Block
						task.Dependencies = append(task.Dependencies, inputNodeName)
						path := "{{tasks." + inputNodeName + ".outputs.parameters." + connection.Variable + "}}"
						task.Arguments.Parameters = append(task.Arguments.Parameters, wfv1.Parameter{
							Name:  name,
							Value: wfv1.AnyStringPtr(path),
						})
					}
				} else {
					// TODO
					return &workflow, blocks, errors.New("unsupported multiple inputs")
				}
			}
		}

		for name, output := range block.Outputs {
			if output.Type == "file" || output.Type == "List[file]" {
				outputFile = true
			}
			template.Outputs.Parameters = append(template.Outputs.Parameters, wfv1.Parameter{
				Name:      name,
				ValueFrom: &wfv1.ValueFrom{Path: name + ".txt"},
			})
		}

		var filesName string
		if cfg.IsLocal {
			filesName = "files"
		} else {
			filesName = organization + "-files"
			workflow.Spec.ImagePullSecrets = []corev1.LocalObjectReference{
				{
					Name: cfg.Cloud.Registry,
				},
			}
		}

		if inputFile {
			template.Inputs.Artifacts = append(template.Inputs.Artifacts, wfv1.Artifact{
				Name: "in",
				Path: cfg.FileDir,
				ArtifactLocation: wfv1.ArtifactLocation{
					S3: &wfv1.S3Artifact{
						Key: filesName,
					},
				},
				Archive: &wfv1.ArchiveStrategy{
					None: &wfv1.NoneStrategy{},
				},
			})
		}
		if outputFile {
			template.Outputs.Artifacts = append(template.Outputs.Artifacts, wfv1.Artifact{
				Name: "out",
				Path: cfg.FileDir,
				ArtifactLocation: wfv1.ArtifactLocation{
					S3: &wfv1.S3Artifact{
						Key: filesName,
					},
				},
				Archive: &wfv1.ArchiveStrategy{
					None: &wfv1.NoneStrategy{},
				},
			})
		}

		tasks[task.Name] = &task
		templates[template.Name] = template
	}

	dag := wfv1.Template{
		Name: "DAG",
		DAG: &wfv1.DAGTemplate{
			Tasks: []wfv1.DAGTask{},
		},
	}

	for _, template := range templates {
		if len(template.Container.Command) > 0 {
			workflow.Spec.Templates = append(workflow.Spec.Templates, *template)
		}
	}

	for name, task := range tasks {
		if len(templates[name].Container.Command) > 0 {
			dag.DAG.Tasks = append(dag.DAG.Tasks, *task)
		}
	}

	workflow.Spec.Templates = append(workflow.Spec.Templates, dag)

	return &workflow, blocks, nil
}