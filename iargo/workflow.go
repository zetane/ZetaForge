package iargo

type EnvVar struct {
    Name string `yaml:"name"`
    Value string `yaml:"value"`
}

type Storage struct {
    Key string `yaml:"key"`
}

type Archive struct {
    None map[string]string `yaml:"none"`
}

type Artifact struct {
    Name string `yaml:"name"`
    Path string `yaml:"path"`
    S3 Storage `yaml:"s3"`
}

type UncompressedArtifact struct {
    Name string `yaml:"name"`
    Path string `yaml:"path"`
    S3 Storage `yaml:"s3"`
    Archive Archive `yaml:"archive"`
}

type ValueFrom struct {
    Path string `yaml:"path"`
}

type Parameter struct {
    Name string `yaml:"name"`
    Value string `yaml:"value,omitempty"`
    ValueFrom ValueFrom `yaml:"valueFrom,omitempty"`
}

type Put struct {
    Artifacts []interface{} `yaml:"artifacts,omitempty"`
    Parameters []Parameter `yaml:"parameters,omitempty"`
}

type Container struct {
    Image string `yaml:"image"`
    Command []string `yaml:"command,flow"`
    ImagePullPolicy string `yaml:"imagePullPolicy,omitempty"`
    Env []EnvVar `yaml:"env,omitempty"`
}

type DAG struct {
    Tasks []Task `yaml:"tasks"`
}

type Template struct {
    Name string `yaml:"name"`
    DAG DAG `yaml:"dag,omitempty"`
    Inputs Put `yaml:"inputs,omitempty"`
    Outputs Put `yaml:"outputs,omitempty"`
    Container Container `yaml:"container,omitempty"`
}

type Metadata struct {
    GenerateName string `yaml:"generateName"`
}

type ArtifactRepository struct {
    ConfigMap string `yaml:"configmap"`
    Key string `yaml:"key"`
}

type Spec struct {
    ServiceAccountName string `yaml:"serviceAccountName"`
    ArtifactRepositoryRef ArtifactRepository `yaml:"artifactRepositoryRef"`
    Entrypoint string `yaml:"entrypoint"`
    Templates []Template `yaml:"templates,omitempty"`
}

type Workflow struct {
    ApiVersion string `yaml:"apiVersion"`
    Kind string `yaml:"kind"`
    Metadata Metadata `yaml:"metadata"`
    Spec Spec `yaml:"spec"`
}

type Argument struct {
    Parameters []Parameter `yaml:"parameters"`
}

type Task struct {
    Name string `yaml:"name"`
    Template string `yaml:"template"`
    Dependencies []string `yaml:"dependencies,omitempty,flow"`
    Argument Argument `yaml:"arguments,omitempty"`
}
