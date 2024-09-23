package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"server/zjson"

	wfv1 "github.com/argoproj/argo-workflows/v3/pkg/apis/workflow/v1alpha1"
	"github.com/aws/aws-sdk-go-v2/service/ecr"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/go-cmd/cmd"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/v1/remote"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type Catalog struct {
	Repositories []string `json:"repositories"`
}

type TagList struct {
	Name string   `json:"name"`
	Tags []string `json:"tags"`
}

func checkImage(ctx context.Context, image string, cfg Config) (bool, bool, error) {
	if cfg.IsLocal {
		if cfg.Local.Driver == "minikube" {
			minikubeImage := cmd.NewCmd("minikube", "-p", cfg.KubeContext, "image", "ls")
			<-minikubeImage.Start()
			for _, line := range minikubeImage.Status().Stdout {
				if "docker.io/zetaforge/"+image == line {
					return true, false, nil
				}
			}
			return false, false, nil
		} else {
			apiClient, err := client.NewClientWithOpts(
				client.WithAPIVersionNegotiation(),
			)
			if err != nil {
				return false, false, err
			}
			defer apiClient.Close()

			imageList, err := apiClient.ImageList(ctx, types.ImageListOptions{})
			if err != nil {
				return false, false, err
			}

			for _, images := range imageList {
				for _, tag := range images.RepoTags {
					if "zetaforge/"+image == tag {
						return true, false, nil
					}
				}

			}

			return false, false, nil
		}
	} else if cfg.Cloud.Provider == "Debug" {
		//TODO use the name package instead
		response, err := http.Get(fmt.Sprintf("http://localhost:%d/v2/_catalog", cfg.Cloud.RegistryPort))
		if err != nil {
			return false, false, err
		}

		defer response.Body.Close()

		body, err := io.ReadAll(response.Body)
		if err != nil {
			return false, false, err
		}

		var catalog Catalog
		if err := json.Unmarshal(body, &catalog); err != nil {
			return false, false, err
		}

		for _, name := range catalog.Repositories {
			response, err := http.Get(fmt.Sprintf("http://localhost:%d/v2/%s/tags/list", cfg.Cloud.RegistryPort, name))
			if err != nil {
				return false, false, err
			}

			defer response.Body.Close()
			body, err := io.ReadAll(response.Body)
			if err != nil {
				return false, false, err
			}
			var tagList TagList
			if err := json.Unmarshal(body, &tagList); err != nil {
				return false, false, err
			}
			for _, tag := range tagList.Tags {
				expectedTagName := fmt.Sprintf("localhost:5000/%s:%s", name, tag)
				if image == expectedTagName {
					return true, false, nil
				}
			}
		}

		return false, false, nil
	} else {
		image := strings.Split(image, ":")
		repo, err := name.NewRepository(registryAddress(cfg) + "/zetaforge/" + image[0])
		if err != nil {
			return false, false, err
		}

		auth, err := registryAuth(ctx, cfg)
		if err != nil {
			return false, false, err
		}

		data, err := remote.List(repo, remote.WithAuth(auth))

		if err != nil {
			return false, true, nil //We want to trigger a build even if the repo doesn't exist
		}

		for _, tag := range data {
			if image[1] == tag {
				return true, false, nil
			}
		}

		return false, false, nil
	}
}

func createRepository(ctx context.Context, image string, cfg Config) error {
	if cfg.IsLocal {
		return nil
	} else if cfg.Cloud.Provider == "aws" {
		image := strings.Split(image, ":")
		client, err := awsECRClient(ctx, cfg)
		if err != nil {
			return err
		}

		fullName := fmt.Sprintf("zetaforge/%s", image[0])
		_, err = client.CreateRepository(ctx, &ecr.CreateRepositoryInput{
			RepositoryName: &fullName,
		})
		if err != nil {
			return err
		}

		return nil
	}

	return nil
}

func blockTemplate(block *zjson.Block, blockKey string, key string, organization string, deployed bool, cfg Config) *wfv1.Template {
	image := getImage(block, organization)
	if cfg.IsLocal {
		image = "zetaforge/" + image
	} else if cfg.Cloud.Provider == "Debug" {
		image = fmt.Sprintf("localhost:%d/zetaforge/%s", cfg.Cloud.RegistryPort, image)
	} else {
		image = registryAddress(cfg) + "/zetaforge/" + image
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
				Key: key + "/" + blockKey + ".py",
			},
		},
		Archive: &wfv1.ArchiveStrategy{
			None: &wfv1.NoneStrategy{},
		},
	}
	idMap := make(map[string]string)
	idMap["key"] = blockKey

	inputs := wfv1.Inputs{Artifacts: []wfv1.Artifact{entrypoint, computations}}
	if deployed {
		inputs = wfv1.Inputs{Artifacts: []wfv1.Artifact{entrypoint}}
	}
	return &wfv1.Template{
		Name: blockKey,
		Container: &corev1.Container{
			Image:           image,
			Command:         block.Action.Container.CommandLine,
			ImagePullPolicy: "IfNotPresent",
			Resources: corev1.ResourceRequirements{
				Requests: corev1.ResourceList{
					corev1.ResourceEphemeralStorage: resource.MustParse("10Gi"),
				},
				Limits: corev1.ResourceList{
					corev1.ResourceEphemeralStorage: resource.MustParse("80Gi"),
				},
			},
			VolumeMounts: []corev1.VolumeMount{
				{
					Name:      "dshm",
					MountPath: "/dev/shm",
				},
			},
		},
		Inputs:   inputs,
		Metadata: wfv1.Metadata{Annotations: idMap},
		Volumes: []corev1.Volume{
			{
				//https://stackoverflow.com/questions/46085748/define-size-for-dev-shm-on-container-engine
				Name: "dshm",
				VolumeSource: corev1.VolumeSource{
					EmptyDir: &corev1.EmptyDirVolumeSource{
						Medium: "Memory",
					},
				},
			},
		},
	}
}

func kanikoTemplate(block *zjson.Block, organization string, cfg Config) *wfv1.Template {
	if cfg.IsLocal {
		return nil
	} else if cfg.Cloud.Provider == "Debug" {
		imageName := block.Action.Container.Image + ":" + block.Action.Container.Version
		image := fmt.Sprintf("registry:%d/zetaforge/%s/%s", cfg.Cloud.Debug.RegistryPort, organization, imageName)
		cmd := []string{
			"/kaniko/executor",
			"--context",
			"dir:///workspace/context",
			"--destination",
			image,
			"--insecure",
			"--compressed-caching=false",
			"--snapshot-mode=redo",
			"--use-new-run",
		}
		artifact := wfv1.Artifact{
			Name: "context",
			Path: "/workspace/context",
			ArtifactLocation: wfv1.ArtifactLocation{
				S3: &wfv1.S3Artifact{
					Key: organization + "/" + getKanikoBuildContextS3Key(block),
				},
			},
			Archive: &wfv1.ArchiveStrategy{
				None: &wfv1.NoneStrategy{},
			},
		}
		return &wfv1.Template{
			Name: getKanikoTemplateName(block, organization),
			Container: &corev1.Container{
				Image:   cfg.KanikoImage,
				Command: cmd,
			},
			Inputs: wfv1.Inputs{Artifacts: []wfv1.Artifact{artifact}},
		}
	} else {
		imageName := block.Action.Container.Image + ":" + block.Action.Container.Version
		image := registryAddress(cfg) + "/zetaforge/" + organization + "/" + imageName
		cmd := []string{
			"/kaniko/executor",
			"--context",
			"dir:///workspace/context",
			"--destination",
			image,
			"--compressed-caching=false",
			"--snapshot-mode=redo",
			"--use-new-run",
			"--cleanup", // Add this to clean up after build
			"--cache=true",
			"--single-snapshot", // Can help reduce layers and save space
		}
		var volumes []corev1.Volume
		var volumeMounts []corev1.VolumeMount

		if cfg.Cloud.Provider == "aws" {
			volumes = append(volumes, corev1.Volume{
				Name: "kaniko-secret",
				VolumeSource: corev1.VolumeSource{
					Secret: &corev1.SecretVolumeSource{
						SecretName: cfg.Cloud.AWS.RegistrySecret,
					},
				},
			})

			volumeMounts = append(volumeMounts, corev1.VolumeMount{
				Name:      "kaniko-secret",
				MountPath: "/root/.aws/",
			})

			volumes = append(volumes, corev1.Volume{
				Name: "kaniko-config",
				VolumeSource: corev1.VolumeSource{
					ConfigMap: &corev1.ConfigMapVolumeSource{
						LocalObjectReference: corev1.LocalObjectReference{
							Name: cfg.Cloud.Registry,
						},
					},
				},
			})

			volumeMounts = append(volumeMounts, corev1.VolumeMount{
				Name:      "kaniko-config",
				MountPath: "/kaniko/.docker/",
			})
		} else if cfg.Cloud.Provider == "oracle" {
			volumes = append(volumes, corev1.Volume{
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
			})

			volumeMounts = append(volumeMounts, corev1.VolumeMount{
				Name:      "kaniko-secret",
				MountPath: "/kaniko/.docker/",
			})
		}
		artifact := wfv1.Artifact{
			Name: "context",
			Path: "/workspace/context",
			ArtifactLocation: wfv1.ArtifactLocation{
				S3: &wfv1.S3Artifact{
					Key: organization + "/" + getKanikoBuildContextS3Key(block),
				},
			},
			Archive: &wfv1.ArchiveStrategy{
				None: &wfv1.NoneStrategy{},
			},
		}
		return &wfv1.Template{
			Name: getKanikoTemplateName(block, organization),
			Container: &corev1.Container{
				Image:        cfg.KanikoImage,
				Command:      cmd,
				VolumeMounts: volumeMounts,
				Resources: corev1.ResourceRequirements{
					Requests: corev1.ResourceList{
						corev1.ResourceEphemeralStorage: resource.MustParse("20Gi"),
					},
					Limits: corev1.ResourceList{
						corev1.ResourceEphemeralStorage: resource.MustParse("90Gi"),
					},
				},
			},
			Inputs:  wfv1.Inputs{Artifacts: []wfv1.Artifact{artifact}},
			Volumes: volumes,
		}
	}

}

func translate(ctx context.Context, pipeline *zjson.Pipeline, organization string, key string, executionUuid string, build bool, deployed bool, cfg Config) (*wfv1.Workflow, map[string]string, error) {
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
		template := blockTemplate(&block, blockKey, key, organization, deployed, cfg)
		task := wfv1.DAGTask{Name: template.Name, Template: template.Name}

		if len(block.Action.Container.Image) > 0 {
			kaniko := kanikoTemplate(&block, organization, cfg)
			built, repo, err := checkImage(ctx, getImage(&block, organization), cfg)
			if err != nil {
				return &workflow, blocks, err
			}

			if repo {
				err = createRepository(ctx, getImage(&block, organization), cfg)
				if err != nil {
					return &workflow, blocks, err
				}
			}

			blockPath := filepath.Join(pipeline.Build, blockKey)
			blocks[blockPath] = ""
			if build || !built {
				if cfg.IsLocal {
					blocks[blockPath] = "zetaforge/" + organization + "/" + block.Action.Container.Image + ":" + block.Action.Container.Version
				} else {
					blocks[blockPath] = block.Action.Container.Image + ":" + block.Action.Container.Version
					templates[kaniko.Name] = kaniko
					tasks[kaniko.Name] = &wfv1.DAGTask{Name: kaniko.Name, Template: kaniko.Name}
					task.Dependencies = append(task.Dependencies, kaniko.Name)
				}
			}

			template.Container.Env = append(template.Container.Env, corev1.EnvVar{
				Name:  "_blockid_",
				Value: blockKey,
			}, corev1.EnvVar{
				Name:  "EXECUTION_UUID",
				Value: executionUuid,
			})
		}

		for name, input := range block.Inputs {
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

		for name := range block.Outputs {
			blockVar := blockKey + "-" + name
			fullPath := cfg.FileDir + "/" + blockVar + ".txt"
			template.Outputs.Parameters = append(template.Outputs.Parameters, wfv1.Parameter{
				Name:      name,
				ValueFrom: &wfv1.ValueFrom{Path: fullPath},
			})
		}

		if cfg.Cloud.Provider == "aws" {
			workflow.Spec.ImagePullSecrets = []corev1.LocalObjectReference{
				{
					Name: cfg.Cloud.AWS.RegistrySecret,
				},
			}
		} else if cfg.Cloud.Provider == "oracle" {
			workflow.Spec.ImagePullSecrets = []corev1.LocalObjectReference{
				{
					Name: cfg.Cloud.Registry,
				},
			}
		}

		template.Inputs.Artifacts = append(template.Inputs.Artifacts, wfv1.Artifact{
			Name: "in",
			Path: cfg.FileDir,
			ArtifactLocation: wfv1.ArtifactLocation{
				S3: &wfv1.S3Artifact{
					Key: key,
				},
			},
			Archive: &wfv1.ArchiveStrategy{
				None: &wfv1.NoneStrategy{},
			},
		})
		template.Outputs.Artifacts = append(template.Outputs.Artifacts, wfv1.Artifact{
			Name: "out",
			Path: cfg.FileDir,
			ArtifactLocation: wfv1.ArtifactLocation{
				S3: &wfv1.S3Artifact{
					Key: key,
				},
			},
			Archive: &wfv1.ArchiveStrategy{
				None: &wfv1.NoneStrategy{},
			},
		})

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

func getImage(block *zjson.Block, organization string) string {
	return organization + "/" + block.Action.Container.Image + ":" + block.Action.Container.Version
}

func getKanikoTemplateName(block *zjson.Block, organization string) string {
	return organization + "-" + getKanikoBuildContextS3Key(block)
}

func getKanikoBuildContextS3Key(block *zjson.Block) string {
	return block.Action.Container.Image + "-" + block.Action.Container.Version + "-build"
}
