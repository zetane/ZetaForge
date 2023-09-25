from kubernetes import client, config
import os
import shutil
import subprocess
import requests
import time
import httpx
import asyncio

import yaml
import hashlib

import dask
from dask.graph_manipulation import bind
from dask.threaded import get
from dask import delayed

from pydantic import create_model, BaseModel, ValidationError
from typing import Dict, Type, List

import psycopg2
from psycopg2.extras import DictCursor
import json

import importlib

import yaml

from datetime import datetime

import sys
import threading

# For now this should only be set to True 
# since we still need the database to get the events resuls from the graph
save_graph_to_database = False
# This needs to move to an .env file
host = 'localhost'
database = 'graph_db1'
username = 'postgres'
password = 'admin'
port = 5432

port_map = {}
port_service = {}

print_lock = threading.Lock()
log_threads = []  # List to keep track of all log threads
stop_event = threading.Event()  # Shared event to signal threads to stop


def get_container_ids_on_network(network_name):
    ''' Get all the container ids that are on a Docker network '''
    command = ["docker", "network", "inspect", network_name]
    result = subprocess.run(command, capture_output=True, text=True)

    # If command fails, print error and return an empty list
    if result.returncode != 0:
        print(f"Error inspecting network {network_name}")
        print(result.stderr)
        return []

    network_info = json.loads(result.stdout)

    # The output is a list with a single dictionary representing the network
    # The 'Containers' field in this dictionary contains info about the connected containers
    containers_info = network_info[0]['Containers']

    # Extract and return the container IDs
    return [container_info['Name'] for container_info in containers_info.values()]


def clear_all(blocks_action):
    ''' Reset containers, images and network'''

    network_name = "block_network"
    uuids = get_container_ids_on_network(network_name)

    for uuid in uuids:
        print(f"\nStopping container", f"{uuid}")
        result = subprocess.run(
            ["docker", "stop", f"{uuid}"], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error stopping container {uuid}")
            print(result.stderr)
            continue
        else:
            print(result.stdout)

        print(f"\nRemoving container", f"{uuid}")
        result = subprocess.run(
            ["docker", "rm", f"{uuid}"], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error removing container {uuid}")
            print(result.stderr)
            continue
        else:
            print(result.stdout)

        im_uuid = uuid.replace('-container', '-image')
        print(f"\nRemoving image", f"{im_uuid}")
        result = subprocess.run(
            ["docker", "rmi", "--force", f"{im_uuid}"], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error removing image {im_uuid}")
            print(result.stderr)
            continue
        else:
            print(result.stdout)

    print(f"\nRemoving network", network_name)
    result = subprocess.run(
        ["docker", "network", "rm", f"{network_name}"], capture_output=True, text=True)
    if result.returncode != 0:
        print("Error removing network", network_name)
        print(result.stderr)
    else:
        print(result.stdout)


def add_port_to_dockerfiles(project_path, blocks_action, port):
    uuids = [d['uuid'] for d in blocks_action]
    folders = [d['block_source'] for d in blocks_action]

    for index, uuid in enumerate(uuids):
        # Load an existing Dockerfile
        with open(os.path.join(project_path, folders[index], "Dockerfile"), "r") as f:
            dockerfile_contents = f.read()

        # Add command to the Dockerfile
        dockerfile_contents += '\nCMD ["python", "messaging.py", "' + \
            str(port)+'"]'

        with open(os.path.join(project_path, folders[index], "Dockerfile_with_port_"+uuid), "w") as f:
            f.write(str(dockerfile_contents))

        port += 1

def build_docker_images(project_path, blocks_action, port):
    '''Build images'''
    uuids = [d['uuid'] for d in blocks_action]
    folders = [d['block_source'] for d in blocks_action]

    for index, uuid in enumerate(uuids):
        # Read the original Dockerfile
        with open(f"{project_path}/{folders[index]}/Dockerfile", 'r') as file:
            original_dockerfile = file.read()

        shutil.copy2(os.path.join(project_path, "backend", "python", "messaging.py"), os.path.join(project_path, folders[index]))

        # Append the COPY and CMD lines 
        tmp_dockerfile_content = original_dockerfile + \
                            f'\nCOPY messaging.py .' + \
                            f'\nCMD ["python", "messaging.py", "{port}"]'

        # Write the temporary Dockerfile
        tmp_dockerfile_path = f"{project_path}/backend/python/Dockerfile_tmp{port}"
        with open(tmp_dockerfile_path, 'w') as file:
            file.write(tmp_dockerfile_content)

        print(f"\nBuilding Docker image for {uuid}", 'Folder Index;', folders[index])
        
        result = subprocess.run(
            ["docker", "build", 
             "-t", f"{uuid}-image", 
             "-f", tmp_dockerfile_path, 
             f"{project_path}/{folders[index]}"], 
            capture_output=True, text=True)

        # Remove the temporary Dockerfile and messaging.py
        os.remove(tmp_dockerfile_path)
        messaging_path = os.path.join(project_path, folders[index], 'messaging.py')
        if os.path.exists(messaging_path):
            os.remove(messaging_path)
        # os.remove(f"{project_path}/{folders[index]}/messaging.py")
        
        port += 1

        sys.stdout.write(result.stdout)
        sys.stderr.write(result.stderr)


def print_logs(container_name, logs):
    """Print logs with a given prefix."""
    with print_lock:
        for line in logs.splitlines():
            sys.stdout.write(f"[{container_name}] {line}\n")


def fetch_logs(container_name):
    last_stdout_size = 0
    last_stderr_size = 0
    
    while not stop_event.is_set():
        # Fetch current stdout logs while redirecting stderr to /dev/null
        process_stdout = subprocess.Popen(["docker", "logs", container_name], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        stdout_logs, _ = process_stdout.communicate()
        stdout_logs = stdout_logs.decode('utf-8')
        current_stdout_size = len(stdout_logs)
        
        if current_stdout_size > last_stdout_size:
            new_stdout_logs = stdout_logs[last_stdout_size:]
            print_logs(f"{container_name} STDOUT", new_stdout_logs)
            last_stdout_size = current_stdout_size
        
        # Fetch current stderr logs while redirecting stdout to /dev/null
        process_stderr = subprocess.Popen(["docker", "logs", container_name], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        _, stderr_logs = process_stderr.communicate()
        stderr_logs = stderr_logs.decode('utf-8')
        current_stderr_size = len(stderr_logs)
        
        if current_stderr_size > last_stderr_size:
            new_stderr_logs = stderr_logs[last_stderr_size:]
            print_logs(f"{container_name} STDERR", new_stderr_logs)
            last_stderr_size = current_stderr_size
        
        time.sleep(0.5)  # Adjust as needed; this determines the log polling interval


def launch_docker_containers(project_path, blocks_action, port, run_path):
    '''Launch network and containers'''

    uuids = [d['uuid'] for d in blocks_action]
    folders = [d['block_source'] for d in blocks_action]

    print(f"\nBuilding block_network")
    result = subprocess.run(
        ["docker", "network", "create", f"block_network"], capture_output=True, text=True)
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)

    for folder in uuids:
        print(f"\nLaunching Docker container for {folder}")

        result = subprocess.run(["docker", "run",
                                "--name", f"{folder}-container",
                                "--net", "block_network",
                                "-p", str(port)+":"+str(port),
                                "-e", "POSTGRES_USER=postgres",
                                "-e", "POSTGRES_PASSWORD=admin",
                                "-e", "POSTGRES_DB=graph_db1",
                                # "-v", "Z:\postgresql\data:/var/lib/postgresql/data",
                                # "-v", os.path.join(project_path, "volume")+":/app/volume",
                                "-v", os.path.join(project_path, "my_data")+":/app/my_data",
                                "-v", os.path.join(run_path, "files")+":/app/files",
                                "-v", run_path+":/app/views",
                                # "-v", os.path.join(project_path,"canny_edge")+":/app/canny_edge",
                                "-d", f"{folder}-image"
                                ], capture_output=True, text=True)

        sys.stdout.write(result.stdout)
        sys.stderr.write(result.stderr)

        # Start fetching logs in a separate thread
        log_thread = threading.Thread(target=fetch_logs, args=(f"{folder}-container",))
        log_thread.start()
        log_threads.append(log_thread)  # Add the log thread to our list

        port += 1

    print("\nDone launching all containers\n")


def launch_kubernetes_containers(project_path, blocks_action, port):
    '''Launch Kubernetes blocks'''

    uuids = [d['uuid'] for d in blocks_action]
    folders = [d['block_source'] for d in blocks_action]

    for folder in uuids:
        print(f"\nLaunching Kubernetes block for {folder}")
        # Create a short label for the deployment by hashing the UUID
        short_label = 'c' + hashlib.md5(folder.encode()).hexdigest()[:10]

        # Creating a Kubernetes Deployment
        deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {"name": f"{short_label}-deployment"},
            "spec": {
                "replicas": 1,
                "selector": {"matchLabels": {"app": f"{short_label}-app"}},
                "template": {
                    "metadata": {"labels": {"app": f"{short_label}-app"}},
                    "spec": {
                        "containers": [{
                            "name": f"{short_label}-container",
                            "image": f"{folder}-image:latest",
                            "imagePullPolicy": "IfNotPresent",
                            "ports": [{"containerPort": port}],
                            "env": [
                                {"name": "POSTGRES_USER", "value": username},
                                {"name": "POSTGRES_PASSWORD", "value": password},
                                {"name": "POSTGRES_DB", "value": database}
                            ],
                            "volumeMounts": [
                                {
                                    "name": "project-volume",
                                    "mountPath": "/app/my_data"
                                }
                            ]
                        }],
                        "volumes": [
                            {
                                "name": "project-volume",
                                "hostPath": {
                                    "path": os.path.join(project_path, "my_data"),
                                    "type": "Directory"
                                }
                            }
                        ]
                    }
                }
            }
        }

        # Creating a Kubernetes Service
        service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {"name": f"{short_label}-service"},
            "spec": {
                "selector": {"app": f"{short_label}-app"},
                "ports": [{"protocol": "TCP", "port": port, "targetPort": port}],
                "type": "NodePort"
            }
        }

        # Writing the Deployment and Service to YAML files
        with open(f"{short_label}-deployment.yaml", 'w') as f:
            yaml.dump(deployment, f)
        with open(f"{short_label}-service.yaml", 'w') as f:
            yaml.dump(service, f)

        # Applying the Deployment and Service
        result = subprocess.run(
            ["kubectl", "apply", "-f", f"{short_label}-deployment.yaml"], capture_output=True, text=True)
        sys.stdout.write(result.stdout)
        sys.stderr.write(result.stderr)
        result = subprocess.run(
            ["kubectl", "apply", "-f", f"{short_label}-service.yaml"], capture_output=True, text=True)
        sys.stdout.write(result.stdout)
        sys.stderr.write(result.stderr)

        port_map[port] = f"{short_label}-service"
        print(port_map)
        port += 1


def get_cluster_ip(service_name):
    # Load the Kubernetes configuration
    config.load_kube_config()

    # Create a Kubernetes API client
    v1 = client.CoreV1Api()

    try:
        # Get the service details
        service = v1.read_namespaced_service(service_name, "default")

        # Retrieve the Cluster IP
        cluster_ip = service.spec.cluster_ip
        return cluster_ip
    except client.rest.ApiException as e:
        print(f"Error retrieving service: {e}")
        return None


def get_service_nodeport_minikube(service_name):
    result = subprocess.run(["kubectl", "get", "service",
                            service_name, "-o", "yaml"], capture_output=True, text=True)
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)

    if result.returncode == 0:
        service_data = yaml.safe_load(result.stdout)
        if service_data:
            ports = service_data.get("spec", {}).get("ports", [])
            for port_info in ports:
                if "nodePort" in port_info:
                    return port_info["nodePort"]
    return None


def get_service_nodeport(service_name, namespace="default"):
    # Load kube_config from default location.
    config.load_kube_config()

    with client.ApiClient() as api_client:
        v1 = client.CoreV1Api(api_client)
        service = v1.read_namespaced_service(service_name, namespace)

        # Assuming you have only one port per service
        node_port = service.spec.ports[0].node_port
        return node_port


def validate_data(data: Dict, data_model):
    # Makes all input_types required by writing (type, ...) instead of type
    for key, value in data_model.items():
        data_model[key] = (value, ...)

    Data = create_model('Data', **data_model)
    try:
        validated_data = Data(**data)
        return validated_data
    except ValidationError as e:
        print(f"\nData validation error: {e}")
        for error_info in e.errors():
            print(error_info)
        return None


def get_minikube_ip():
    result = subprocess.run(['minikube', 'ip'], capture_output=True, text=True)
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)
    return result.stdout.decode('utf-8').strip()


def send_to_block(port, data, data_model):
    # Data validation
    validated_data = validate_data(data, data_model)

    if validate_data:
        data = validated_data.dict()

        # Send to block
        max_retries = 5
        retry_delay = 2  # seconds

        for attempt in range(max_retries):
            try:
                if kubernetes_computation == True:
                    node_port = get_service_nodeport(f"{port_map[port]}")
                    response = requests.post(
                        f'http://localhost:{node_port}/process', json=data)
                else:
                    response = requests.post(
                        'http://localhost:'+str(port)+'/process', json=data)

                result = response.json()

                if response.status_code == 200:
                    return result
                else:
                    print(f"Error: {response.status_code}, {response.content}")

            except requests.exceptions.RequestException as e:
                print(f"Error: {e}")

            if attempt < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print("Max retries reached. Giving up.")


def remove_temp_files_from_blocks(project_path, folders):
    for folder in folders:
        os.remove(os.path.join(project_path, folder, "messaging.py"))
        os.remove(os.path.join(project_path, folder,
                  "Dockerfile_with_port+"+folder))


def push_to_jsonb_table(json_data):
    cur = conn.cursor()
    # Convert the Python dictionary to a JSON string
    json_string = json.dumps(json_data)

    # Insert the JSON data into the database
    insert_query = "INSERT INTO my_table (data) VALUES (%s);"
    cur.execute(insert_query, (json_string,))
    conn.commit()
    cur.close()


def get_last_id_row():
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    query = "SELECT * FROM my_table WHERE id = (SELECT max(id) FROM my_table);"
    cur.execute(query)
    row = cur.fetchone()
    result = dict(row) if row else None
    conn.commit()
    cur.close()
    return result


def extract_inputs_from_graph(data, input_types):
    inputs = {}
    for k in input_types.keys():
        inputs[k] = data[k]
    return inputs


def insert_outputs_in_graph(data, block_key, inputs_from_block, outputs):
    out = {}
    out["outputs"] = {}
    inp = {}
    inp["inputs"] = inputs_from_block
    for k in outputs.keys():
        out["outputs"].update({k: outputs[k]})

    data[block_key]["events"].append({'outputs': out["outputs"], 'inputs': inputs_from_block})
    print(data[block_key]["events"])

    # data[block_key]["events"].append(out)
    # data[block_key]["events"].append(inp)
    return data


def json_types_eval(incoming_type_pairs):
    type_dict = {}
    for k in incoming_type_pairs:
        type_dict[k] = eval(incoming_type_pairs[k])
    return type_dict


def convert_to_dask_graph(graph):
    dask_graph = {}
    for key, value in graph.items():
        function_name = value["function"]
        function = globals()[function_name]  # Get the function from its name
        args = value["args"]
        dask_args = [globals()[arg] if arg in globals()
                     else arg for arg in args]
        dask_graph[key] = (function, *dask_args)
    return dask_graph


def find_block(nested_dict, target_key, target_value):
    def search(nested_dict, key_path=None):
        if key_path is None:
            key_path = []

        for key, value in nested_dict.items():
            if isinstance(value, dict):
                if len(key_path) >= 1 and target_key in value and value[target_key] == target_value:
                    return key_path[-1]
                result = search(value, key_path + [key])
                if result:
                    return result

    return search(nested_dict)


def find_empty_input_connection(d, path=None):
    path = [] if path is None else path
    for key, value in d.items():
        new_path = path + [key]
        if key == "connections" and value == []:
            return new_path
        elif isinstance(value, dict):
            result = find_empty_input_connection(value, new_path)
            if result is not None:
                return result
    return None


def block_handler(block_uuid, port_number, run_id, run_path, *data):

    # Load the contents of the JSON files and merge them
    merged_data = {}
    for json_file in data:
        merged_data = merge_dicts(merged_data, json_file)

    block_key = find_block(merged_data, "id", block_uuid)

    # Insert run_id
    merged_data[block_key]["information"]["run_id"] = run_id

    input_types_from_block = {}
    inputs_from_block = {}

    if len(merged_data[block_key]["inputs"].items()) == 0:
        for key, value in merged_data[block_key]["parameters"].items():
            variable_type = merged_data[block_key]["parameters"][key]["type"]
            variable_value = merged_data[block_key]["parameters"][key]["value"]

            # Check if variable type starts with "List"
            if variable_type.startswith("List"):
                # Ensure variable_value is a list
                if not isinstance(variable_value, list):
                    # IF we want to have users enter the list brackets
                    # variable_value = json.loads(variable_value.replace("'", "\""))

                    # IF users don't enter list brackets
                    variable_value = [
                        item.strip() for item in variable_value.replace("'", "").split(",")]

            input_types_from_block.update({key: variable_type})
            inputs_from_block.update({key: variable_value})

    else:
        for key, value in merged_data[block_key]["inputs"].items():
            variable_type = merged_data[block_key]["inputs"][key]["type"]
            input_types_from_block.update({key: variable_type})

        inputs_from_block = get_block_inputs_and_types(merged_data, block_uuid)

    outputs, error = send_to_block(port_number, inputs_from_block, input_types_from_block)

    print(f'\n*** {block_uuid} on port {port_number} ***\nOutputs:\n{outputs}\nLogs:\n{error}\n')

    # outputs['error'] = error
    outputs['log'] = error

    updated_data = insert_outputs_in_graph(merged_data, block_key, inputs_from_block, outputs)

    with open(os.path.join(run_path, "partial_results/pipeline_"+block_uuid+".json"), "w") as outfile:
        json.dump(updated_data, outfile, indent=4)

    return updated_data


def import_function(function_name):
    module = importlib.import_module('task_graph_functions')
    function = getattr(module, function_name)
    return function


def merge_dicts(dict1, dict2):
    result = dict1.copy()
    for key, value in dict2.items():
        if key in result:
            if isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = merge_dicts(result[key], value)
            elif isinstance(result[key], list) and isinstance(value, list):
                result[key] = result[key] if len(
                    result[key]) >= len(value) else value
            else:
                result[key] = value
        else:
            result[key] = value
    return result


def init(project_path, blocks_action, first_port):
    clear_all(blocks_action)
    build_docker_images(project_path, blocks_action, first_port)


def run(block, project_path, run_id):
    first_port = 5001  # initial port

    block_keys = list(block.keys())
    blocks_action = []

    for k in block_keys:
        id = block[k]["information"]["id"]
        block_source = block[k]["action"]["block_source"]
        container_uuid = block[k]["action"]["container_uuid"]
        container_image_uuid = block[k]["action"]["container_image_uuid"]
        blocks_action.append({"uuid": id, "block_source": block_source,
                           "container_uuid": container_uuid, "container_image_uuid": container_image_uuid})

    if kubernetes_computation == True:
        if build == True:

            result = subprocess.run(['kubectl', 'delete', 'daemonsets,replicasets,services,deployments,blocks,rc,ingress',
                                    '--all', '-n', 'default'], capture_output=True, text=True)
            sys.stdout.write(result.stdout)
            sys.stderr.write(result.stderr)
            # For full Kubernetes reset
            # kubectl delete daemonsets,replicasets,services,deployments,blocks,rc,ingress --all -n default
            # kubectl delete daemonsets,replicasets,services,deployments,blocks,rc,ingress --all --all-namespaces

            init(project_path, blocks_action, first_port)
        launch_kubernetes_containers(project_path, blocks_action, first_port)
    else:
        if build == True:
            init(project_path, blocks_action, first_port)
            launch_docker_containers(project_path, blocks_action, first_port, run_path)

    terminal_key = find_empty_input_connection(block)

    terminal_uuid = block[terminal_key[0]]['information']['id']

    # Convert the block to a dask graph and save as active_dask_pipeline.json
    block_to_dask(block, run_id, run_path)
    print('Executing dask graph\n')
    
    with open(os.path.join(run_path, "active_dask_pipeline.json"), "r") as f:
        task_graph = json.load(f)
    # Convert the file dask graph in a usable dask format
    dask_task_graph = convert_to_dask_graph(task_graph)
    # Launch the execution of the pipeline
    result = get(dask_task_graph, 'task_'+terminal_uuid)


def get_block_inputs_and_types(block_from_frontend, block_uuid):
    ret_inputs = {}
    inputs = []
    block_key = find_block(block_from_frontend, "id", block_uuid)
    block = block_from_frontend[block_key]
    for key, value in block["inputs"].items():
        inputs.append((key, value))

    for var in inputs:
        # We only allow one connection per input variable
        node_id = var[1]["connections"][0]["node"]
        input_var_name = var[1]["connections"][0]["output"]

        in_value = block_from_frontend[node_id]["events"][0]["outputs"][input_var_name]

        ret_inputs.update({var[0]: in_value})
    return ret_inputs


class Logger(object):
    def __init__(self, filename="Default.log"):
        self.terminal = sys.stdout
        self.filename = filename
        self.log = None

    def __enter__(self):
        self.log = open(self.filename, "a")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        sys.stdout = sys.__stdout__
        sys.stderr = sys.__stderr__
        if self.log:
            self.log.close()

    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
        self.log.flush()

    def close(self):
        if self.log:
            self.log.close()

    def flush(self):
        # this flush method is needed for python 3 compatibility.
        pass


def make_history_folder(project_path):
    # Get the current timestamp in a human-readable format with milliseconds
    timestamp = datetime.now().strftime(f'%Y-%m-%d_%Hh-%Mm-%Ss-%f')[:26]

    run_id = f"run_{timestamp}"
    folder_path = os.path.join(project_path, 'history', run_id)

    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
    else:
        print(f'Error: The history {folder_path} folder already exists.')
    
    files_path = os.path.join(folder_path, 'files')

    if not os.path.exists(files_path):
        os.makedirs(files_path)
        
    return folder_path, run_id



if __name__ == "__main__":    
    import sys
    import argparse
    import logging
    logging.basicConfig(level=logging.DEBUG)
    from convert_pipeline_to_dask import block_to_dask

    project_path = ''

    kubernetes_computation = None
    build = None

    parser = argparse.ArgumentParser()
    parser.add_argument('--compute', type=str, default='docker_network', choices=['docker_network', 'kubernetes_docker_desktop'],
                        help="Choose the computation method. Options: 'docker_network' or 'kubernetes_docker_desktop'. Default is 'docker_network'.")
    parser.add_argument('--build', type=str, default='true', choices=['true', 'false'],
                        help="Choose whether to build or not. Options: 'true' or 'false'. Default is 'true'.")

    parser.add_argument('graph', type=str, help="Input JSON graph to compute")

    args = parser.parse_args()

    if args.build:
        if args.build == 'true':
            build = True
        elif args.build == 'false':
            build = False

    if args.compute:
        if args.compute == 'docker_network':
            kubernetes_computation = False
        elif args.compute == 'kubernetes_docker_desktop':
            kubernetes_computation = True

    project_path = os.path.dirname(os.path.dirname(os.path.realpath(os.path.dirname(__file__))))
    run_id = None
    run_path = None
    inference_number = 1

    if build is True:
        inference_number = 1
        run_path, run_id = make_history_folder(project_path)
        active_run = {
        "absolute_run_path": run_path,
        "run_id": run_id,
        "inference": inference_number
        }
        # *** Write to Database
        with open(os.path.join(project_path,'history','active_run.json'), 'w') as json_file:
            json.dump(active_run, json_file, indent=4)
    else:
        inference_number += 1
        json_path = os.path.join(project_path, 'history', 'active_run.json')
        with open(json_path, 'r') as json_file:
            data = json.load(json_file)
            run_path = data['absolute_run_path']
            run_id = data['run_id']
            data['inference'] = inference_number
            # *** Write to Database
            with open(os.path.join(project_path,'history','active_run.json'), 'w') as json_file:
                json.dump(data, json_file, indent=4)

    with Logger(os.path.join(run_path,"full_logs.txt")) as logger:
        import traceback

        try:
            sys.stdout = sys.stderr = logger
            print("\n\nStarting computations")
            print(f'Build: {build}, Computation: {args.compute}, File: {args.graph}')
            print('Saving and logging folder:', run_path)
            
            # folder_path = '_temp'
            folder_path = os.path.join(run_path, 'partial_results')
            os.makedirs(folder_path, exist_ok=True)

            folder_path_merged = os.path.join(run_path, 'results')
            os.makedirs(folder_path_merged, exist_ok=True)

            pipeline_path = os.path.join(run_path, 'pipeline')
            os.makedirs(pipeline_path, exist_ok=True)
            shutil.copy2(os.path.join(project_path, "history", "active_pipeline.json"), os.path.join(run_path, 'pipeline', f'pipeline_{inference_number}.json'))

            with open(args.graph) as f:
                block = json.load(f)
            data = block
            globals()["data"] = data

            # Database interaction
            if save_graph_to_database is True:
                conn = psycopg2.connect(
                    database=database, user=username, password=password, host=host, port=port)
                push_to_jsonb_table(block)

            pretty_block_from_frontend = json.dumps(block, indent=4)
            print('\nPipeline to compute\n', pretty_block_from_frontend, '\n')

            run(block, project_path, run_id)

            json_files = [os.path.join(folder_path, f)
                        for f in os.listdir(folder_path) if f.endswith('.json')]

            # Load the contents of the JSON files and merge them
            merged_data = {}
            for json_file in json_files:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                    merged_data = merge_dicts(merged_data, data)

            # Write the merged contents to a new JSON file
            # *** Write to Database
            with open(os.path.join(folder_path_merged, f'computed_pipeline_{inference_number}.json'), 'w') as f_merged:
                json.dump(merged_data, f_merged, indent=4)
            # When using a local Postgres database
            if save_graph_to_database is True:
                push_to_jsonb_table(merged_data)
                conn.close()

            stop_event.set()  # Signal all threads to stop

            # Wait for all log threads to finish:
            for thread in log_threads:
                thread.join()

            print("Computations complete")

        except Exception as e:
            print("Unhandled Exception:", e)
            traceback.print_exc()
    
