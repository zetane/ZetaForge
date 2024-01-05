package zjson

type Information struct {
    Id string `json:"id"`
    Name string `json:"name"`
    Description string `json:"description"`
    SystemVersions []string `json:"system_versions"`
    BlockVersion string `json:"block_version"`
    BlockSource string `json:"block_source"`
    BlockType string `json:"block_type"`
}

type Connection struct {
    Block string `json:"block"`
    Variable string `json:"variable"`
}

type Put struct {
    Type string `json:"type"`
    Connections []Connection `json:"connections"`
    Relays []Connection `json:"relays,omitempty"`
}

type Container struct {
    Image string `json:"image"`
    Version string `json:"version"`
    CommandLine []string `json:"command_line"`
}

type Action struct {
    Container Container `json:"container,omitempty" jsonschema:"oneof_required=container"`
    Pipeline map[string]Block `json:"pipeline,omitempty" jsonschema:"oneof_required=pipeline"`
    Parameters map[string]Parameter `json:"parameters,omitempty" jsonschema:"oneof_required=parameter"`
}

type TitleBar struct {
    BackgroundColor string `json:"background_color"`
}

type Preview struct {
    Active string `json:"active"`
}

type Node struct {
    Active string `json:"active"`
    TitleBar TitleBar `json:"title_bar"`
    Preview Preview `json:"preview"`
    Html string `json:"html"`
    PosX string `json:"pos_x"`
    PosY string `json:"pos_y"`
    PosZ string `json:"pos_z"`
    Behavior string `json:"behavior"`
}

type Views struct {
    Node Node `json:"node"`
}

type Parameter struct {
    Value string `json:"value"`
    Type string `json:"type"`
}

type Event struct {
    Inputs []string `json:"inputs,omitempty"`
    Outputs []string `json:"outputs,omitempty"`
}

type Block struct {
    Information Information `json:"information"`
    Inputs map[string]Put `json:"inputs"`
    Outputs map[string]Put `json:"outputs"`
    Action Action `json:"action"`
    Views Views `json:"views,omitempty"`
    Events Event `json:"events"`
}

type Pipeline struct {
    Id string `json:"id"`
    Pipeline map[string]Block `json:"pipeline"`
    Source string `json:"source"`
    Sink string `json:"sink"`
    Build string `json:"build"`
}
