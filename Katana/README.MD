# Katana

Katana is a Go-based tool designed to manage and execute pipelines for various computational tasks, including Docker and non-Docker modes. It handles the execution of blocks defined in pipelines and efficiently manages file movement and history logging.

## Features

- Execute pipelines in Docker or locally.
- Supports mounting files and managing environments.
- Tracks execution history in timestamped folders.
- Handles the movement of computation outputs to history folders.

## Usage

Katana can be run in two modes: `docker` and `local` (non-docker mode). It expects a pipeline directory with blocks and their corresponding computational logic.

### Running in Docker Mode

```
go run . --mode=docker <pipeline-name>
```
- PRE REQ: you must have a dockerfile , and requirements.txt(could be empty) files inside the block folder
- This will build the Docker image if it's not found and execute the pipeline using Docker.
- All necessary files from the pipeline folder will be mounted in Docker containers.

#### Dockerfile Example

Here’s an example of a `Dockerfile` that can be used to run the pipeline:

```Dockerfile
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy necessary files
COPY . .

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install -r requirements.txt
```


### Running in Non-Docker Mode

```
go run . --mode=uv <pipeline-name>
```
or
```
go run . --mode=no-uv <pipeline-name>
```

- This will execute the pipeline directly on your local machine without Docker.
- UV mode will create a virtual environment inside block folders, install requirements and then run each block. All the subsequent runs will use the existing environment to run. no installataion will be there after the 1st run.

## Pipeline Structure

A pipeline directory contains multiple blocks, each of which has its own computational logic (such as `computations.py`). Here’s an example of the directory structure:

```
main_dir/
  |--> pipeline1/
  |      |--> block1/
  |      |      |--> computations.py
  |      |      |--> requirements.txt
  |      |--> block2/
  |      |--> pipeline.json
  |--> entrypoint.py
  |--> katana (Go)
```

Each block has:

- `computations.py`: The script that executes the block's computation.
- `requirements.txt`: The Python dependencies required to run `computations.py`.

### History Management

For each pipeline execution, a timestamped folder will be created inside the `history` folder. All output files will be moved to this folder.

## Example

To run the pipeline named `abcd` in Docker mode:

```
go run . --mode=docker abcd
```

## Configuration

You can define blocks and their parameters in `pipeline.json` within the pipeline directory. This file defines the computational blocks and how they connect with each other.


## Important Notice

If you encounter an error such as:  
`path not found: 'files/fiz/xxxxx...'`  

You may need to update the `computations.py` file. Modify the line that generates the HTML path to ensure it uses a unique identifier. For example:

```python
html_path = f"viz_{unique_id}.html"
```
