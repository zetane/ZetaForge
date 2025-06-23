package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"server/katana"
	"strings"
	"time"
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
  # Run with uv using a specific binary
  katana -runner uv -uv-path /usr/local/bin/uv ./my-pipeline input:data.csv
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
	uvPath     string
	help       bool
}

func main() {
	startTime := time.Now()
	opts := options{}

	// Define flags
	flag.StringVar(&opts.runner, "runner", "default", "Execution mode: default, uv, or docker")
	flag.StringVar(&opts.mode, "mode", "full", "Preserve full history of runs")
	flag.BoolVar(&opts.verbose, "verbose", false, "Enable verbose logging")
	flag.BoolVar(&opts.noCache, "no-cache", false, "Disable caching (applies to uv and docker modes)")
	flag.StringVar(&opts.workingDir, "work-dir", "", "Custom working directory (default: /tmp/katana)")
	flag.StringVar(&opts.uvPath, "uv-path", "", "Path to uv binary (optional, default: search in PATH)")
	flag.BoolVar(&opts.help, "help", false, "Show detailed help message")

	// Custom usage message
	flag.Usage = func() {
		fmt.Fprintln(os.Stderr, usage)
		flag.PrintDefaults()
	}

	flagParseTime := time.Now()
	flag.Parse()
	if opts.verbose {
		log.Printf("Flag parsing took: %v", time.Since(flagParseTime).Round(time.Millisecond))
	}

	if opts.help {
		flag.Usage()
		os.Exit(0)
	}

	// Validate mode
	validationStart := time.Now()
	validModes := map[string]bool{"full": true, "partial": true, "prod": true}
	if !validModes[opts.mode] {
		log.Fatalf("Invalid mode: %s. Must be one of: full, partial, prod", opts.mode)
	}
	if opts.verbose {
		log.Printf("Mode validation took: %v", time.Since(validationStart).Round(time.Millisecond))
	}

	// Need at least the pipeline directory
	args := flag.Args()
	if len(args) < 1 {
		flag.Usage()
		os.Exit(1)
	}

	pathStart := time.Now()
	pipelinePath := handlePipelinePath(args[0])
	if opts.verbose {
		log.Printf("Pipeline path handling took: %v", time.Since(pathStart).Round(time.Millisecond))
	}

	// Parse parameter key-value pairs
	paramStart := time.Now()
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
	if opts.verbose {
		log.Printf("Parameter parsing took: %v", time.Since(paramStart).Round(time.Millisecond))
	}

	// Set up execution options
	execStart := time.Now()
	execOpts := katana.Options{
		Mode:         opts.mode,
		Runner:       opts.runner,
		Args:         argsKeyVal,
		PipelinePath: pipelinePath,
		Verbose:      opts.verbose,
		NoCache:      opts.noCache,
		WorkingDir:   opts.workingDir,
		UVPath:       opts.uvPath,
	}
	if opts.verbose {
		log.Printf("Execution options setup took: %v", time.Since(execStart).Round(time.Millisecond))
	}

	// Run the pipeline using the katana executor
	runStart := time.Now()
	if err := katana.Run(execOpts); err != nil {
		if opts.verbose {
			log.Printf("Pipeline execution failed after: %v", time.Since(runStart).Round(time.Millisecond))
		}
		log.Fatalf("Execution failed: %v", err)
	}
	if opts.verbose {
		log.Printf("Pipeline execution took: %v", time.Since(runStart).Round(time.Millisecond))
		log.Printf("Total execution time: %v", time.Since(startTime).Round(time.Millisecond))
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
