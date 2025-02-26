package katana

import (
	"bufio"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"maps"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"server/zjson"
)

//go:embed entrypoint.py
var entrypoint []byte
var TMPPATH = "/tmp/katana"

type Dict map[string]string
type Execution func(args Dict) (Dict, error)

type TaskMessage struct {
	Dict Dict
	Err  error
}

type Task struct {
	Name   string
	Exec   func(args Dict) error
	MapIn  Dict
	MapOut Dict
	In     []<-chan TaskMessage
	Out    []chan<- TaskMessage
}

type Param struct {
	Name  string
	Value string
	Out   []chan<- TaskMessage
}

// KeyValue represents a parameter passed to the execution
type KeyValue struct {
	Key   string
	Value string
}

// Options configures how the execution runs
type Options struct {
	// Mode specifies the history: "full", "partial", or "prod"
	Mode string

	// Picks the runner: "docker", "uv", or "default"
	Runner string

	// Args contains parameter key-value pairs
	Args []KeyValue

	// PipelinePath is the directory containing pipeline.json
	PipelinePath string

	// Verbose enables detailed logging
	Verbose bool

	// NoCache disables caching in uv and docker modes
	NoCache bool

	// WorkingDir specifies a custom working directory (default: /tmp/katana)
	WorkingDir string

	UVPath string
}

func copyToHistoryFolder(historySubfolder string, filePaths []string) {
	for _, srcFile := range filePaths {
		// Destination path in the history folder
		destFile := filepath.Join(historySubfolder, filepath.Base(srcFile))

		// Copy the file
		source, err := os.Open(srcFile)
		if err != nil {
			log.Fatalf("Failed to open source file: %v", err)
		}
		defer source.Close()

		destination, err := os.Create(destFile)
		if err != nil {
			log.Fatalf("Failed to create destination file: %v", err)
		}
		defer destination.Close()

		_, err = io.Copy(destination, source)
		if err != nil {
			log.Fatalf("Failed to copy file: %v", err)
		}

		log.Println("Copied file to", destFile)
	}
}

func prepareHistoryFolder(pipelinePath string) string {
	// Create the history folder path
	historyDir := filepath.Join(pipelinePath, "history")

	// Create the timestamped subfolder inside history folder
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	historySubfolder := filepath.Join(historyDir, timestamp)

	// Ensure the history subfolder exists
	err := os.MkdirAll(historySubfolder, os.ModePerm)
	if err != nil {
		log.Fatalf("Failed to create history folder: %v", err)
	}

	log.Println("Prepared history folder at", historySubfolder)

	// Return the path of the history subfolder for further use
	return historySubfolder
}

func execCommand(cmd string, execDir string, blockId string, args Dict, opts Options) error {
	var command *exec.Cmd
	var commandArgs []string
	var additionalEnv []string

	// Build the command arguments from the args
	for key, value := range args {
		commandArgs = append(commandArgs, key+"="+value)
	}
	// Convert the paths to absolute paths
	absExecDir, err := filepath.Abs(execDir) // this should point to the block folder where computations.py is located
	if err != nil {
		log.Fatalf("Failed to get absolute path for dir: %v", err)
	}
	// Convert Windows paths to forward slashes for Docker compatibility
	absExecDir = filepath.ToSlash(execDir)
	if err != nil {
		log.Fatalf("Failed to get absolute path for history subfolder: %v", err)
	}

	if opts.Runner == "docker" {
		// Mount the block folder to ensure Docker has access to computations.py
		directoryMerkle, _ := computeDirectoryMerkleTree(absExecDir)
		dockerImage := filepath.Base(absExecDir) + ":" + directoryMerkle.Hash

		command = exec.Command("docker", "run", "--rm",
			"-v", absExecDir+":/app",
			dockerImage,
			"python", "/app/entrypoint.py", // Execute entrypoint.py inside Docker
			opts.Runner)
	} else if opts.Runner == "uv" {
		uvCmd := runWithUV(blockId, absExecDir, opts.UVPath, opts)
		command = uvCmd.Cmd
		additionalEnv = uvCmd.AdditionalEnv
	} else {
		command = exec.Command(cmd)
	}

	// Append commandArgs to the command
	command.Args = append(command.Args, commandArgs...)

	// Set environment variables
	command.Env = os.Environ()
	command.Env = append(command.Env, additionalEnv...)
	command.Env = append(command.Env, "_blockid_="+blockId)

	// Set up pipes for stdout and stderr
	stdout, err := command.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %v", err)
	}
	stderr, err := command.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to create stderr pipe: %v", err)
	}

	// Start the command
	if err := command.Start(); err != nil {
		return fmt.Errorf("failed to start command: %v", err)
	}

	// Create a scanner for stdout
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			log.Printf("[%v] Output: %v", blockId, scanner.Text())
		}
	}()

	// Create a scanner for stderr
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			log.Printf("[%v] Error: %v", blockId, scanner.Text())
		}
	}()

	// Wait for the command to complete
	return command.Wait()
}

func (t *Task) Execute(args Dict, executionDir string, opts Options) (Dict, error) {
	inputs := make(Dict)
	for key, value := range t.MapIn {
		inputs[value] = args[key]
	}

	outputs := make(Dict)
	err := t.Exec(inputs)
	if err != nil {
		return outputs, err
	}

	// TODO: If we want types, we have to encode them here
	for key, _ := range t.MapOut {
		fullName := filepath.Join(executionDir, t.Name, key)
		bytes, err := os.ReadFile(fullName + ".txt")

		if err != nil {
			return outputs, err
		}
		var data map[string]string
		json.Unmarshal(bytes, &data)
		for _, v := range data {
			outputs[key] = v
		}
	}

	return outputs, nil
}

func deployTask(pipeline *zjson.Pipeline, executionDir string, opts Options) (Execution, func()) {
	//ctx, cancel := context.WithCancel(context.Background())
	tasks := make(map[string]*Task)
	inputs := make(map[string]*Param)
	outputs := make(map[string]<-chan TaskMessage)

	for name, block := range pipeline.Pipeline {
		name := name
		block := block
		log.Printf("[%v] Deploying..", name)
		blockPath := filepath.Join(executionDir, name)
		cmd := block.Action.Command.Exec
		var blockExecDir string
		if block.Action.Container.Image != "" {
			tasks[name] = &Task{Name: name, Exec: func(args Dict) error {
				log.Println("Error building task: ", args)
				return nil
			}}

			if block.Action.Command.Dir == "" {
				os.WriteFile(filepath.Join(blockPath, "entrypoint.py"), entrypoint, 0644)
				blockExecDir = blockPath
			} else {
				os.WriteFile(filepath.Join(block.Action.Command.Dir, "entrypoint.py"), entrypoint, 0644)
				blockExecDir = block.Action.Command.Dir
			}
			// This doesn't make a lot of sense
			// TODO: More robust handling of Command vs Container
			// specifically around uv vs docker modes
			// e.g. why do we have an entrypoint.py if the user is giving the command?
			tasks[name] = &Task{Name: name, Exec: func(args Dict) error {
				return execCommand(cmd, blockExecDir, name, args, opts)
			}}
		} else if len(block.Action.Parameters) > 0 {
			// Iterate over block parameters
			for key, value := range block.Action.Parameters {
				finalValue := value.Value // Default to the original value

				// Search for a matching key in argsKeyVal
				for i := range opts.Args {
					if opts.Args[i].Key == key {
						// If a match is found, replace the final value with the argument value
						finalValue = opts.Args[i].Value
						break // Stop searching after the first match
					}
				}

				inputs[name] = &Param{Name: key, Value: finalValue}
				//fmt.Println("Key:", key, ", Final Value:", finalValue)
			}
		} else if block.Action.Command.Exec != "" {
			if block.Action.Command.Dir == "" {
				os.WriteFile(filepath.Join(blockPath, "entrypoint.py"), entrypoint, 0644)
				blockExecDir = blockPath
			} else {
				os.WriteFile(filepath.Join(block.Action.Command.Dir, "entrypoint.py"), entrypoint, 0644)
				blockExecDir = block.Action.Command.Dir
			}
			// fmt.Println("writing entrypoint to :", name)
			tasks[name] = &Task{Name: name, Exec: func(args Dict) error {
				return execCommand(cmd, blockExecDir, name, args, opts)
			}}
		} else {
			log.Fatal("Unknown block")
		}
	}

	for name, block := range pipeline.Pipeline {
		if block.Action.Container.Image != "" || block.Action.Command.Exec != "" {
			task := tasks[name]
			task.MapIn = make(Dict)
			task.MapOut = make(Dict)
			for label, input := range block.Inputs {
				for _, connection := range input.Connections {
					pipe := make(chan TaskMessage, 1)
					task.In = append(task.In, pipe)
					task.MapIn[connection.Block+connection.Variable] = label
					if parent, ok := tasks[connection.Block]; ok {
						parent.Out = append(parent.Out, pipe)
					} else if parent, ok := inputs[connection.Block]; ok {
						parent.Out = append(parent.Out, pipe)
					} else {
						log.Fatal("Unknown connection")
					}
				}
			}
			for label, output := range block.Outputs {
				if len(output.Connections) == 0 {
					pipe := make(chan TaskMessage, 1)
					outputs[name] = pipe
					task.Out = append(task.Out, pipe)
				} else {
					task.MapOut[name+label] = block.Information.Id + "-" + label
				}
			}
		}
	}

	for _, task := range tasks {
		log.Printf("[%v] Running task..", task.Name)
		go runTask(task, executionDir, opts)
	}

	execution := func(args Dict) (Dict, error) {
		for name, input := range inputs {
			dict := make(Dict)
			dict[name+input.Name] = input.Value
			for i := 0; i < len(input.Out); i++ {
				input.Out[i] <- TaskMessage{Dict: dict}
			}
		}

		results := make(Dict)
		for _, output := range outputs {
			o := <-output
			if o.Err != nil {
				return results, o.Err
			}
			maps.Copy(results, o.Dict)
		}

		return results, nil
	}

	release := func() {
		for _, input := range inputs {
			for i := 0; i < len(input.Out); i++ {
				close(input.Out[i])
			}
		}
	}

	return execution, release
}

func runTask(task *Task, executionDir string, opts Options) {
	args := make(Dict, len(task.In))

	// Only execute once
	var executionError error
	for i := 0; i < len(task.In); i++ {
		arg, ok := <-task.In[i]
		if !ok {
			for _, next := range task.Out {
				close(next)
			}
			return
		}
		maps.Copy(args, arg.Dict)

		if arg.Err != nil {
			executionError = arg.Err
		}
	}

	if executionError != nil {
		for _, next := range task.Out {
			next <- TaskMessage{Err: executionError}
		}
		return // Exit after sending error
	}

	dict, err := task.Execute(args, executionDir, opts)

	if err != nil {
		err = fmt.Errorf("\n\ntask %s: %w", task.Name, err)
	}

	message := TaskMessage{Dict: dict, Err: err}

	// Send to all outputs and exit
	for _, next := range task.Out {
		next <- message
	}
}

func runDocker(pipelinePath string, imageName string, opts Options) {
	checkCmd := exec.Command("docker", "images", "-q", imageName)
	checkOutput, err := checkCmd.Output()
	if err != nil {
		log.Fatalf("Error checking Docker image: %v", err)
	}

	// If the image does not exist, build it
	if len(checkOutput) == 0 {
		log.Println("Docker image not found, building...")
		dockerFile := filepath.Join(pipelinePath, "Dockerfile")

		// Check if Dockerfile exists
		if _, err := os.Stat(dockerFile); os.IsNotExist(err) {
			log.Fatalf("Dockerfile not found in %s", pipelinePath)
		}

		// Build the Docker image
		buildCmd := exec.Command("docker", "build", "-t", imageName, "-f", dockerFile, pipelinePath)
		buildCmd.Stdout = os.Stdout
		buildCmd.Stderr = os.Stderr

		log.Println("Building Docker image...")
		err := buildCmd.Run()
		if err != nil {
			log.Fatalf("Error building Docker image: %v", err)
		}
	} else {
		log.Println("Using existing Docker image...")
	}

	// Convert paths to absolute paths with forward slashes
	absPipelinePath, err := filepath.Abs(pipelinePath)
	if err != nil {
		log.Fatalf("Failed to get absolute path: %v", err)
	}
	absPipelinePath = filepath.ToSlash(absPipelinePath)

	historySubfolder := prepareHistoryFolder(absPipelinePath)

	runLocalPipelineInDocker(absPipelinePath, historySubfolder, opts)
}

func runLocalPipelineInDocker(pipelinePath string, historySubfolder string, opts Options) {
	data, err := os.ReadFile(filepath.Join(pipelinePath, "pipeline.json"))
	if err != nil {
		log.Fatal(err)
	}

	var pipeline zjson.Pipeline
	err = json.Unmarshal(data, &pipeline)
	if err != nil {
		log.Fatal(err)
	}

	if pipeline.Sink != "" {
		TMPPATH = pipeline.Sink
	}

	// Skip history subfolder creation since it is already done

	// Deploy the task and execute it
	execution, release := deployTask(&pipeline, historySubfolder, opts)

	result, err := execution(make(Dict))
	if err != nil {
		log.Println("Error running docker pipeline:", err)
	} else {
		log.Println("Completed running", result)
	}

	release()
}

func runDefault(pipeline *zjson.Pipeline, executionDir string, opts Options) {
	execution, release := deployTask(pipeline, executionDir, opts)

	result, err := execution(make(Dict))
	if err != nil {
		log.Fatal(err)
	} else {
		log.Println("Completed running", result)
	}

	release()
}

// validateOptions checks if the provided options are valid
func validateOptions(opts *Options) error {
	if opts.PipelinePath == "" {
		return fmt.Errorf("pipeline path is required")
	}

	if opts.WorkingDir == "" {
		opts.WorkingDir = "/tmp/katana"
	}

	// Create working directory if it doesn't exist
	if err := os.MkdirAll(opts.WorkingDir, 0755); err != nil {
		return fmt.Errorf("failed to create working directory: %w", err)
	}

	return nil
}

// Run executes the pipeline with the given options using the katana executor
func Run(opts Options) error {
	if err := validateOptions(&opts); err != nil {
		return err
	}

	if opts.Verbose {
		log.Printf("Starting katana execution with runner %s\n", opts.Runner)
	}

	executionDir, fullHistoryDir, pipeline, err := setupExecution(opts)
	if err != nil {
		log.Fatalf("Failed to setup execution: %v", err)
	}

	// Get the initial state of the execution directory
	log.Println("Reading execution dir..")
	originalFiles, err := getDirectoryContents(executionDir)
	if err != nil {
		return fmt.Errorf("failed to get initial directory contents: %w", err)
	}

	// Run the pipeline
	log.Println("Running pipeline..")
	var runErr error
	switch opts.Runner {
	case "docker":
		dockerImageName := "katana-" + pipeline.Id
		runDocker(opts.PipelinePath, dockerImageName, opts)
	case "uv":
		log.Println("Running pipeline in uv mode")
		if opts.UVPath, err = ensureUV(opts.UVPath); err != nil {
			runErr = fmt.Errorf("failed to ensure uv is installed: %w", err)
		} else {
			runDefault(pipeline, executionDir, opts)
		}
	default:
		runDefault(pipeline, executionDir, opts)
	}

	// Check history toggle, if we don't want history, purge copied files
	if runErr == nil {
		changedFiles, unchangedFiles, err := getFileChanges(executionDir, originalFiles)
		if err != nil {
			log.Fatalf("Failed to identify file changes: %v", err)
		}
		if opts.Mode == "partial" {
			if err := cleanup(unchangedFiles); err != nil {
				return fmt.Errorf("failed to cleanup directory: %w", err)
			}
		}
		if opts.Mode == "prod" {
			if err := copyChangedFiles(fullHistoryDir, changedFiles); err != nil {
				log.Fatalf("Failed to copy changed files: %v", err)
			}
		}
	}

	return runErr
}
