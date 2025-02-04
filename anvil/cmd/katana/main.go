// cmd/katana/main.go
package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"server/katana"
)

const usage = `katana - Graph Execution Engine

Usage:
  katana [flags] <pipeline-directory> [param:value ...]

Description:
  Katana executes computational graphs defined in pipeline.json files. It can run
  with three different executors:
    - default: Uses system dependencies (python, libraries, etc.)
    - uv: Uses uv to manage Python virtual environments and dependencies
    - docker: Containerizes the execution using Docker

  By default, Katana is immutable and will copy your pipeline to a history folder and
  execute in that folder. You can preserve only partial history with -mode partial.
  You can run in the working directory and have no immutability with -mode prod.

Examples:
  # Run a pipeline using system dependencies
  katana ./my-pipeline input:data.csv

  # Run with uv for dependency management
  katana -runner uv ./my-pipeline input:data.csv

  # Run with uv in production
  katana -runner uv -mode prod ./my-pipeline input:data.csv

  # Run in Docker mode
  katana -runner docker ./my-pipeline input:data.csv

Parameters:
  <pipeline-directory>    Directory containing pipeline.json and related files
  param:value            Key-value pairs passed to the pipeline as parameters

Flags:`

type options struct {
	runner     string
	mode       string
	verbose    bool
	noCache    bool
	workingDir string
	help       bool
}

func main() {
	opts := options{}

	// Define flags
	flag.StringVar(&opts.runner, "runner", "default", "Execution mode: default, uv, or docker")
	flag.StringVar(&opts.mode, "mode", "full", "Preserve full history of runs")
	flag.BoolVar(&opts.verbose, "verbose", false, "Enable verbose logging")
	flag.BoolVar(&opts.noCache, "no-cache", false, "Disable caching (applies to uv and docker modes)")
	flag.StringVar(&opts.workingDir, "work-dir", "", "Custom working directory (default: /tmp/katana)")
	flag.BoolVar(&opts.help, "help", false, "Show detailed help message")

	// Custom usage message
	flag.Usage = func() {
		fmt.Fprintln(os.Stderr, usage)
		flag.PrintDefaults()
	}

	flag.Parse()

	if opts.help {
		flag.Usage()
		os.Exit(0)
	}

	// Validate mode
	validModes := map[string]bool{"full": true, "partial": true, "prod": true}
	if !validModes[opts.mode] {
		log.Fatalf("Invalid mode: %s. Must be one of: full, partial, prod", opts.mode)
	}

	// Need at least the pipeline directory
	args := flag.Args()
	if len(args) < 1 {
		flag.Usage()
		os.Exit(1)
	}

	pipelinePath := handlePipelinePath(args[0])

	// Parse parameter key-value pairs
	var argsKeyVal []katana.KeyValue
	for _, arg := range args[1:] {
		parts := strings.SplitN(arg, ":", 2)
		if len(parts) != 2 {
			log.Fatalf("Invalid parameter format: %s (expected key:value)", arg)
		}
		argsKeyVal = append(argsKeyVal, katana.KeyValue{
			Key:   parts[0],
			Value: parts[1],
		})
	}

	// Set up execution options
	execOpts := katana.Options{
		Mode:         opts.mode,
		Runner:       opts.runner,
		Args:         argsKeyVal,
		PipelinePath: pipelinePath,
		Verbose:      opts.verbose,
		NoCache:      opts.noCache,
		WorkingDir:   opts.workingDir,
	}

	// Run the pipeline using the katana executor
	if err := katana.Run(execOpts); err != nil {
		log.Fatalf("Execution failed: %v", err)
	}
}

func handlePipelinePath(pipelineName string) string {
	pipelinePath, err := filepath.Abs(pipelineName)
	if err != nil {
		log.Fatalf("Failed to resolve pipeline path: %v", err)
	}

	// Ensure the path exists
	if _, err := os.Stat(pipelinePath); os.IsNotExist(err) {
		log.Fatalf("Pipeline directory does not exist: %s", pipelinePath)
	}

	// Convert to forward slashes for consistency across OS
	return filepath.ToSlash(pipelinePath)
}
