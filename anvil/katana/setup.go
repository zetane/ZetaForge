// katana/paths.go
package katana

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"server/zjson"
	"time"
)

type InputMapping struct {
	BlockName   string
	ParamName   string
	OutputType  string
	TargetBlock string
}

func buildInputMappings(pipeline *zjson.Pipeline) map[string]InputMapping {
	inputMappings := make(map[string]InputMapping)

	for blockName, block := range pipeline.Pipeline {
		// Look at outputs to determine type
		for outputName, output := range block.Outputs {
			// Only map if there's a corresponding parameter
			if _, exists := block.Action.Parameters[outputName]; exists {
				argName := output.Connections[0].Variable
				targetBlock := output.Connections[0].Block
				inputMappings[argName] = InputMapping{
					BlockName:   blockName,
					ParamName:   outputName,
					OutputType:  output.Type,
					TargetBlock: targetBlock,
				}
			}
		}
	}

	return inputMappings
}

func processInputs(pipeline *zjson.Pipeline, args []KeyValue, inputMappings map[string]InputMapping, executionDir string) error {
	for _, arg := range args {
		mapping, exists := inputMappings[arg.Key]
		if !exists {
			continue
		}

		block := pipeline.Pipeline[mapping.BlockName]

		if mapping.OutputType == "file" {
			absPath, err := resolveAndVerifyPath(arg.Value, executionDir)
			if err != nil {
				return fmt.Errorf("invalid file path for input '%s': %w", arg.Key, err)
			}

			block.Action.Parameters[mapping.ParamName] = zjson.Parameter{
				Value: absPath,
				Type:  mapping.OutputType,
			}
		} else {
			block.Action.Parameters[mapping.ParamName] = zjson.Parameter{
				Value: arg.Value,
				Type:  mapping.OutputType,
			}
		}

		pipeline.Pipeline[mapping.BlockName] = block
	}

	return nil
}

func setupExecution(opts Options) (string, string, *zjson.Pipeline, error) {
	// Create execution directory
	log.Println("Starting setup..")
	historyDir := filepath.Join(opts.PipelinePath, "history")
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	fullHistory := filepath.Join(historyDir, timestamp)
	executionDir := fullHistory
	if err := os.MkdirAll(fullHistory, os.ModePerm); err != nil {
		return "", "", nil, fmt.Errorf("failed to create execution directory: %w", err)
	}
	log.Printf("Wrote history folder to %v", fullHistory)

	// Read and parse pipeline
	data, err := os.ReadFile(filepath.Join(opts.PipelinePath, "pipeline.json"))
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to read pipeline: %w", err)
	}

	var pipeline zjson.Pipeline
	if err := json.Unmarshal(data, &pipeline); err != nil {
		return "", "", nil, fmt.Errorf("failed to parse pipeline: %w", err)
	}

	// Copy pipeline files to execution directory
	if opts.Mode == "prod" {
		// Dangerously set our dir to the pipeline dir
		executionDir = opts.PipelinePath
	} else {
		if err := copyDirectory(opts.PipelinePath, executionDir); err != nil {
			return "", "", nil, fmt.Errorf("failed to copy pipeline files: %w", err)
		}
	}

	// Build input mappings
	inputMappings := buildInputMappings(&pipeline)

	// Process inputs and update pipeline
	log.Println("Processing inputs..")
	if err := processInputs(&pipeline, opts.Args, inputMappings, executionDir); err != nil {
		return "", "", nil, fmt.Errorf("failed to process inputs: %w", err)
	}

	// Write updated pipeline back to execution directory
	updatedPipelineData, err := json.MarshalIndent(pipeline, "", "  ")
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to marshal updated pipeline: %w", err)
	}

	log.Println("Writing pipeline..")
	if err := os.WriteFile(filepath.Join(fullHistory, "pipeline.json"), updatedPipelineData, 0644); err != nil {
		return "", "", nil, fmt.Errorf("failed to write updated pipeline: %w", err)
	}

	return executionDir, fullHistory, &pipeline, nil
}

// resolveAndVerifyPath converts a relative path to absolute and verifies the file exists
func resolveAndVerifyPath(path, basePath string) (string, error) {
	// If the path is not absolute, make it relative to basePath
	if !filepath.IsAbs(path) {
		path = filepath.Join(basePath, path)
	}

	// Convert to absolute path
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("failed to resolve absolute path: %w", err)
	}

	// Convert to forward slashes for consistency
	absPath = filepath.ToSlash(absPath)

	// Check if file exists
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return "", fmt.Errorf("file does not exist: %s", absPath)
	} else if err != nil {
		return "", fmt.Errorf("error checking file: %w", err)
	}

	return absPath, nil
}
