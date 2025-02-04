package zjson

type BlockInformation struct {
	Id             string   `json:"id"`
	Name           string   `json:"name"`
	Description    string   `json:"description,omitempty"`
	SystemVersions []string `json:"system_versions"`
	BlockVersion   string   `json:"block_version"`
	BlockSource    string   `json:"block_source"`
	BlockType      string   `json:"block_type"`
}

type PipelineInformation struct {
	Name           string `json:"name"`
	Description    string `json:"description,omitempty"`
	SystemVersions string `json:"system_versions"`
	Source         string `json:"source"`
	Type           string `json:"type"`
}

type Connection struct {
	Block    string `json:"block"`
	Variable string `json:"variable"`
}

type Put struct {
	Type        string       `json:"type"`
	Connections []Connection `json:"connections"`
	Relays      []Connection `json:"relays,omitempty"`
}

type Container struct {
	Image       string   `json:"image"`
	Version     string   `json:"version"`
	CommandLine []string `json:"command_line"`
}

type Command struct {
	Exec string `json:"exec"`
	Dir  string `json:"dir,omitempty"`
}

type ResourceQuantity struct {
	Request string `json:"request"`
	Limit   string `json:"limit"`
}

type GPU struct {
	Count int `json:"count"`
}

type Resources struct {
	CPU    ResourceQuantity `json:"cpu,omitempty"`
	Memory ResourceQuantity `json:"memory,omitempty"`
	GPU    GPU              `json:"gpu,omitempty"`
}

type Action struct {
	Container  Container            `json:"container,omitempty"`
	Command    Command              `json:"command,omitempty"` // commmand replaces docker, actual command,deer paremeter: if the command is empty, i
	Pipeline   map[string]Block     `json:"pipeline,omitempty"`
	Parameters map[string]Parameter `json:"parameters,omitempty"`
	Resources  Resources            `json:"resources,omitempty"`
}

type TitleBar struct {
	BackgroundColor string `json:"background_color,omitempty"`
}

type Preview struct {
	Active  string `json:"active,omitempty"`
	Content string `json:"content,omitempty"`
}

type Node struct {
	Active   string              `json:"active"`
	TitleBar TitleBar            `json:"title_bar"`
	Preview  Preview             `json:"preview"`
	Html     string              `json:"html"`
	PosX     string              `json:"pos_x"`
	PosY     string              `json:"pos_y"`
	PosZ     string              `json:"pos_z"`
	Behavior string              `json:"behavior,omitempty"`
	Order    map[string][]string `json:"order,omitempty"`
}

type Views struct {
	Node Node   `json:"node"`
	Mode string `json:"mode,omitempty"`
}

type Parameter struct {
	Value string `json:"value"`
	Type  string `json:"type"`
}

type Event struct {
	Inputs  map[string]string `json:"inputs,omitempty"`
	Outputs map[string]string `json:"outputs,omitempty"`
	Log     []string          `json:"log,omitempty"`
}

type Block struct {
	Information BlockInformation `json:"information"`
	Inputs      map[string]Put   `json:"inputs"`
	Outputs     map[string]Put   `json:"outputs"`
	Action      Action           `json:"action"`
	Views       Views            `json:"views,omitempty"`
	Events      Event            `json:"events"`
}

type Pipeline struct {
	Id       string           `json:"id"`
	Name     string           `json:"name"`
	Pipeline map[string]Block `json:"pipeline"`
	Sink     string           `json:"sink"`
	Build    string           `json:"build"`
}

type Execution struct {
	Id         string             `json:"id"`
	Pipeline   Pipeline           `json:"pipeline"`
	MerkleTree PipelineMerkleTree `json:"merkleTree"`
	Build      bool               `json:"build"`
}

type BuildContextStatusRequest struct {
	Rebuild    bool               `json:"rebuild"`
	Pipeline   Pipeline           `json:"pipeline"`
	MerkleTree PipelineMerkleTree `json:"merkleTree"`
}

type BuildContextStatusResponse struct {
	BlockKey   string `json:"blockKey"`
	IsUploaded bool   `json:"isUploaded"`
	S3Key      string `json:"s3Key"`
	Hash       string `json:"hash"`
}

type PipelineMerkleTree struct {
	Hash   string                        `json:"hash"`
	Blocks map[string]PipelineMerkleTree `json:"blocks,omitempty"`
	Files  DirectoryMerkleTree           `json:"files,omitempty"`
}

type DirectoryMerkleTree struct {
	Hash     string                `json:"hash"`
	Path     string                `json:"path"`
	Children []DirectoryMerkleTree `json:"children,omitempty"`
}
