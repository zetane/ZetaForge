package oargo

type Parameter struct {
    Name string `json:"name"`
    Value string `json:"value"`
}

type Put struct {
    Parameters []Parameter `json:"parameters"`
}

type Node struct {
    Id string `json:"displayName"`
    Type string `json:"type"`
    Template string `json:"templateName"`
    Phase string `json:"phase"`
    Start string `json:"startedAt"`
    Finish string `json:"finishedAt"`
    Input Put `json:"inputs"`
    Output Put `json:"outputs"`
}

type Status struct {
    Phase string `json:"phase"`
    Start string `json:"startedAt"`
    Finish string `json:"finishedAt"`
    Nodes map[string]Node `json:"nodes"`
}

type Metadata struct {
    Name string `json:"name"`
}

type Workflow struct {
    Metadata Metadata `json:"metadata"`
    Status Status `json:"status"`
}

