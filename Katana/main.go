package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"log"
	"maps"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

//go:embed entrypoint.py
var entrypoint []byte

var TMPPATH = "/tmp/katana"

var historySubfolder = ""

func execCommand(cmd string, dir string, id string, args Dict, historySubfolder string) error {
	var command *exec.Cmd
	var commandArgs []string

	// Build the command arguments from the args
	for key, value := range args {
		commandArgs = append(commandArgs, key+"="+value)
	}

	if runtime.GOOS == "windows" {
		command = exec.Command("python", dir+"\\entrypoint.py", dir, historySubfolder)
	} else {
		command = exec.Command("python3", dir+"/entrypoint.py", dir, historySubfolder)
	}

	// Append commandArgs to the command
	command.Args = append(command.Args, commandArgs...)

	// Set environment variables
	command.Env = os.Environ()
	command.Env = append(command.Env, "_blockid_="+id)

	// Execute the command and capture output
	output, err := command.CombinedOutput()
	if err != nil {
		log.Println("Error", err)
	} else {
		log.Println("Output: ", string(output))
	}

	return err
}

type Dict map[string]string
type Execution func(args Dict) (Dict, error)

type Message struct {
	Dict Dict
	Err  error
}

type Task struct {
	Name   string
	Exec   func(args Dict) error
	MapIn  Dict
	MapOut Dict
	In     []<-chan Message
	Out    []chan<- Message
}

func (t *Task) Execute(args Dict) (Dict, error) {
	inputs := make(Dict)
	for key, value := range t.MapIn {
		inputs[value] = args[key]
	}

	outputs := make(Dict)
	err := t.Exec(inputs)
	if err != nil {
		return outputs, err
	}

	for key, value := range t.MapOut {

		data, err := os.ReadFile(filepath.Join(TMPPATH, t.Name, value) + ".txt") // wants to read from the block floder
		if err != nil {
			var new_histrory_subfolder = historySubfolder[len(filepath.Base(TMPPATH)):]
			data, err = os.ReadFile(filepath.Join(TMPPATH, new_histrory_subfolder, value) + ".txt") // wants to read from the 'history' floder
		}
		// fmt.Println("## Trying to readfile for the task:", t.Name, ". And the file to read: ", data, ", error while reading: ", err)
		if err != nil {
			return outputs, err
		}

		outputs[key] = string(data)

		os.Remove(filepath.Join(TMPPATH, value) + ".txt")
	}

	return outputs, nil
}

type Param struct {
	Name  string
	Value string
	Out   []chan<- Message
}

func deployTask(pipeline *Pipeline, historySubfolder string) (Execution, func()) {
	tasks := make(map[string]*Task)
	inputs := make(map[string]*Param)
	outputs := make(map[string]<-chan Message)

	for name, block := range pipeline.Pipeline { // basically this funciton maps key value for parameters, writes entrypoint.py and stores every task in task dictionary.
		name := name
		block := block
		if block.Action.Container.Image != "" {
			tasks[name] = &Task{Name: name, Exec: func(args Dict) error {
				log.Println("Error: ", args)
				return nil
			}}
			if block.Action.Command.Dir == "" {
				os.WriteFile(filepath.Join(TMPPATH, name, "entrypoint.py"), entrypoint, 0644)
			} else {
				os.WriteFile(filepath.Join(block.Action.Command.Dir, "entrypoint.py"), entrypoint, 0644)
				// fmt.Println("Written from 108")
			}

			tasks[name] = &Task{Name: name, Exec: func(args Dict) error { // without that entrypoint won't run
				return execCommand(block.Action.Command.Exec, filepath.Join(TMPPATH, name), block.Information.Id, args, historySubfolder)
			}}
		} else if len(block.Action.Parameters) > 0 {
			for key, value := range block.Action.Parameters {
				inputs[name] = &Param{Name: key, Value: value.Value}
				// fmt.Println("Key", name, ", Value: ", value)
			}
			// fmt.Println("inputs:", inputs)
		} else if block.Action.Command.Exec != "" {
			if block.Action.Command.Dir == "" {
				os.WriteFile("entrypoint.py", entrypoint, 0644)
			} else {
				os.WriteFile(filepath.Join(block.Action.Command.Dir, "entrypoint.py"), entrypoint, 0644)
			}
			// fmt.Println("writing entrypoint to :", name)
			tasks[name] = &Task{Name: name, Exec: func(args Dict) error {
				return execCommand(block.Action.Command.Exec, block.Action.Command.Dir, block.Information.Id, args, historySubfolder)
			}}
		} else {
			log.Fatal("Unknown block")
		}
	}

	for name, block := range pipeline.Pipeline { // so this blocks extracts inputs and outputs for each block if they are to be executed.
		if block.Action.Container.Image != "" ||
			block.Action.Command.Exec != "" {
			task := tasks[name]
			task.MapIn = make(Dict)
			task.MapOut = make(Dict)
			for label, input := range block.Inputs { // I am assuming it takes the input parameters
				for _, connection := range input.Connections {
					pipe := make(chan Message, 1)
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
			for label, output := range block.Outputs { // I am assuming it takes the output parameters
				if len(output.Connections) == 0 {
					pipe := make(chan Message, 1)
					outputs[name] = pipe
					task.Out = append(task.Out, pipe)
				} else {
					task.MapOut[name+label] = block.Information.Id + "-" + label
				}
			}
		}
	}

	for _, task := range tasks {
		go runTask(task)
	}

	execution := func(args Dict) (Dict, error) {
		for name, input := range inputs {
			dict := make(Dict)
			dict[name+input.Name] = input.Value
			for i := 0; i < len(input.Out); i++ {
				input.Out[i] <- Message{Dict: dict}
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

func runTask(task *Task) {
	args := make(Dict, len(task.In))

	for {
		var executionError error // initially (0x0 , 0x0)

		for i := 0; i < len(task.In); i++ {
			// fmt.Print("\nin run task for task: ", task.Name, "\tCurrent Task.in: ", task.In[i])
			arg, ok := <-task.In[i]
			// fmt.Println("\t>>ARG , OK: ", arg, ok)
			if !ok {
				// fmt.Println("NOT OKAY for : ", task.Name)
				for _, next := range task.Out {
					close(next)
				}
				return
			}

			maps.Copy(args, arg.Dict)

			if arg.Err != nil {
				// fmt.Println(">>>>>>>>>ERROR found in : ", task.Name, " , and the error is: ", arg.Err)
				executionError = arg.Err
			}
		}

		if executionError != nil {
			// fmt.Println("\n\t\t\t\tERROR FOUND IN LINE: 213")
			for _, next := range task.Out {
				next <- Message{Err: executionError}
			}

			continue
		}

		dict, err := task.Execute(args)
		// fmt.Println("Executed the task: ", task.Name)
		if err != nil {
			err = fmt.Errorf("\n\ntask %s: %w", task.Name, err)
		}

		message := Message{Dict: dict, Err: err}

		for _, next := range task.Out {
			next <- message
		}
	}
}

func main() {

	if len(os.Args) < 2 {
		log.Fatal("Pipeline name or path must be provided as an argument.")
	}

	pipelineName := os.Args[1]
	pipelinePath := filepath.Join(".", pipelineName)

	data, err := os.ReadFile(filepath.Join(pipelinePath, "pipeline.json"))
	if err != nil {
		log.Fatal(err)
	}

	var pipeline Pipeline
	err = json.Unmarshal(data, &pipeline)
	if err != nil {
		log.Fatal(err)
	}

	if pipeline.Sink != "" {
		TMPPATH = pipeline.Sink
	}

	// Create the history subfolder using the current timestamp
	historyDir := filepath.Join(pipelinePath, "history")
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	historySubfolder = filepath.Join(historyDir, timestamp)
	os.MkdirAll(historySubfolder, os.ModePerm)

	execution, release := deployTask(&pipeline, historySubfolder)

	result, err := execution(make(Dict))
	if err != nil {
		// log.Println("Error from line 282:", err)
	} else {
		log.Println("COMPLETED.", result)
	}

	release()

}
