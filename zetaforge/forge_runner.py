import os
import subprocess
import platform
import time
import json
from pkg_resources import resource_filename
from .check_forge_dependencies import check_minikube, check_running_kube, check_kube_pod, check_kubectl
from .install_forge_dependencies import *
from pathlib import Path
from colorama import init, Fore
from datetime import datetime
import socket
import json
import shutil
import threading
from .mixpanel_client import mixpanel_client
import sentry_sdk
from .logger import CliLogger

run_env = mixpanel_client.is_dev
env = "production"
if run_env:
    env = "development"
sentry_sdk.init(
    dsn="https://7fb18e8e487455a950298625457264f3@o1096443.ingest.us.sentry.io/4507031960223744",

    # Enable performance monitoring
    enable_tracing=True,
    environment=env
)

BUILD_YAML = resource_filename("zetaforge", os.path.join('utils', 'build.yaml'))
INSTALL_YAML = resource_filename("zetaforge", os.path.join('utils', 'install.yaml'))

EXECUTABLES_PATH = os.path.join(Path(__file__).parent, 'executables')
FRONT_END = os.path.join(EXECUTABLES_PATH, "frontend")

logger = CliLogger()

def write_json(server_version, client_version, context, driver, is_dev, s2_path=None):
    if s2_path:
        server_path = s2_path
    else:
        _, server_path = get_launch_paths(server_version, client_version)
    config = create_config_json(os.path.dirname(server_path), context, driver, is_dev)
    return config

#changes the IsDev in config.json, it's implemented to prevent certain edge cases.
def change_env_config(server_version, client_version, env):
    _, server_path = get_launch_paths(server_version, client_version)
    config = dict()
    config_path = os.path.join(os.path.dirname(server_path), "config.json")
    with open(config_path, "r") as f:
        config = json.load(f)
    config['IsDev'] = env
    with open(config_path, "w") as outfile:
        json.dump(config, outfile)
    return outfile

def check_for_container(name):
    ls_cmd = subprocess.run(["docker", "container", "ls", '--format', 'json'], capture_output=True, text=True)
    container_id = None

    if ls_cmd.returncode == 0:
        output_list = ls_cmd.stdout.splitlines()

        for container_str in output_list:
            if container_str.strip():
                container = json.loads(container_str.strip())
                if container['Names'].startswith(name):
                    container_id = container['ID']
                    break
    else:
        print(f"Error: {ls_cmd.stderr}")

    if container_id:
        print(f"Container ID: {container_id}")
        return container_id
    else:
        print("No matching container found.")
        return None


def find_available_port(start_port, end_port):
    for port in range(start_port, end_port):
        print(f"Trying {port}..")
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('localhost', port))
                s.close()  # Close the socket to release the port
                print(f"Port {port} is open, setting this for the registry")
                return port
            except OSError:
                pass
    return None

def get_kubectl_contexts():
    # Get the list of kubectl contexts
    result = subprocess.run(["kubectl", "config", "get-contexts"], capture_output=True, text=True)
    lines = result.stdout.strip().split("\n")[1:]  # Skip the header line

    contexts = []
    for line in lines:
        parts = line.split()
        if len(parts) >= 3:
            context_name = parts[2]
            if context_name.startswith("*"):
                context_name = context_name[1:]
            contexts.append(context_name)

    return contexts

def select_kubectl_context():
    # Get the list of kubectl contexts
    contexts = get_kubectl_contexts()
    selected = logger.show_numbered_menu("Select kubernetes context: ", contexts)

    return contexts[selected]

def setup(server_version, client_version, driver, build_flag = True, install_flag = True, is_dev=False, server_path=None):
    mixpanel_client.track_event('Setup Initiated')

    if driver == "minikube":
        context = "zetaforge"
        if not check_minikube():
            mixpanel_client.track_event("Setup Failure - Minikube Not Found")
            time.sleep(0.5)
            logger.error("Minikube not found. Please install minikube.")
            raise Exception("Minikube not found!")
        minikube = subprocess.run(["minikube", "-p", "zetaforge", "start"], capture_output=True, text=True)
        if minikube.returncode != 0:
            mixpanel_client.track_event("Setup Failure - Cannot Start Minikube")
            time.sleep(0.5)
            logger.error(minikube.stderr)
            raise Exception("Error while starting minikube")
        mixpanel_client.track_event("Setup - Minikube Started")
    else:
        context = select_kubectl_context()
        kubectl_flag = check_kubectl()

        switch_context = None
        if kubectl_flag:
            switch_context = subprocess.run(["kubectl", "config", "use-context", f"{context}"], capture_output=True, text=True)
            mixpanel_client.track_event("Setup - Kubectl Found")
        else:
            logger.error("Kubectl not found. Please install docker-desktop, orbstack, or minikube and enable kubernetes, or ensure that kubectl is installed and is able to connect to a working kubernetes cluster.")
            mixpanel_client.track_event("Setup Failure - Kubectl Not Found")
            time.sleep(0.5)
            raise EnvironmentError("Kubectl not found!")

        in_context = (switch_context.returncode == 0)

        if not in_context:
            logger.error(f"Cannot find the context {context} for kubernetes. Please double check that you have entered the correct context.")
            mixpanel_client.track_event("Setup Failure - Context Switch Error")
            raise Exception("Exception while setting the context")

        mixpanel_client.track_event("Setup - Context changed")
        running_kube = check_running_kube(context)
        if not running_kube:
            raise Exception("Kubernetes is not running, please start kubernetes and ensure that you are able to connect to the kube context.")

    config_path = write_json(server_version, client_version, context, driver, is_dev, s2_path=server_path)

    logger.success(f"Setup complete, wrote config to {config_path}.")
    mixpanel_client.track_event("Setup Successful")
    return config_path

def safe_decode(byte_string, encodings=['utf-8', 'windows-1252']):
    for encoding in encodings:
        try:
            return byte_string.decode(encoding)
        except UnicodeDecodeError:
            continue
    # If all specified encodings fail, fall back to ISO-8859-1 (latin-1)
    return byte_string.decode('iso-8859-1', errors='replace')

def read_output(process, name):
    for line in process.stdout:
        print(f"{name}: {safe_decode(line)}", end='')

def read_error(process, name):
    for line in process.stderr:
        print(f"{name} (stderr): {safe_decode(line)}", end='')

#dev version is only passed, when a developer wants to pass a local version(for e.g. dev_path=./s2-v2.3.5-amd64)
def run_forge(server_version=None, client_version=None, server_path=None, client_path=None, is_dev=False, no_sandbox=False):
    global time_start
    time_start = datetime.now()
    mixpanel_client.track_event('Launch Initiated')
    change_env_config(server_version, client_version, is_dev)
    #init is called for collarama library, better logging.
    init()

    if server_path is None:
        _, server_path = get_launch_paths(server_version, client_version)

    if client_path is None:
        client_path, _ = get_launch_paths(server_version, client_version)

    try:
        server = None
        client = None
        logger.success(f"Launching execution server {server_path}..")
        server_executable = os.path.basename(server_path)
        if platform.system() != 'Windows':
            server_executable = f"./{server_executable}"
        else:
            server_executable = server_path

        try:
            server = subprocess.Popen([server_executable],stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=os.path.dirname(server_path))
        except:
            mixpanel_client.track_event("Launch Failure - Anvil Launch Failed")
            raise Exception(f"Error occurred while launching the server executable: {server_executable}")

        mixpanel_client.track_event('Launch - Anvil Launched')

        logger.success(f"Launching client {client_path}..")
        client_executable = os.path.basename(client_path)
        if platform.system() == 'Darwin':
            client_executable = [f"./{client_executable}"]
        elif platform.system() == 'Windows':
            client_executable = [client_path, '--no-sandbox']
        else:
            client_executable = [f"./{client_executable}", "--no-sandbox"]

        #handles the situation where user launches pip launcher with is_dev, for the client executable.
        if is_dev:
            client_executable.append("--is_dev")

        if no_sandbox:
            client_executable.append("--no-sandbox")

        try:
            client = subprocess.Popen(client_executable, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=os.path.dirname(client_path))
        except:
            mixpanel_client.track_event("Launch Failure - Client Launch Failed")
            raise Exception(f"Error occurred while launching the client executable: {client_executable}")

        mixpanel_client.track_event('Launch - Client Launched')

        # Create threads to read the outputs concurrently
        server_stdout_thread = threading.Thread(target=read_output, args=(server, '[server]'))
        server_stderr_thread = threading.Thread(target=read_error, args=(server, '[server]'))
        client_stdout_thread = threading.Thread(target=read_output, args=(client, '[client]'))
        client_stderr_thread = threading.Thread(target=read_error, args=(client, '[client]'))

        # Start the threads
        server_stdout_thread.start()
        server_stderr_thread.start()
        client_stdout_thread.start()
        client_stderr_thread.start()

        # Wait for the threads to finish
        server_stdout_thread.join()
        server_stderr_thread.join()
        client_stdout_thread.join()
        client_stderr_thread.join()

        mixpanel_client.track_event('Launch Successful')

    except KeyboardInterrupt:
        print("Terminating servers..")

    finally:
        total_time = (datetime.now() - time_start).total_seconds()

        try:
            mixpanel_client.track_event('Launch End', props={'Duration(seconds)': total_time})
            time.sleep(2) # mixpanel instance is asynch, so making sure that it completes the call before tear down
        except:
            print("Mixpanel cannot track")

#purge executables, and upload them from the scratch
def purge():
    shutil.rmtree(EXECUTABLES_PATH)
    os.makedirs(EXECUTABLES_PATH)

def teardown(driver):
    if driver == "minikube":
        minikube = subprocess.run(["minikube", "-p", "zetaforge", "stop"], capture_output=True, text=True)
        if minikube.returncode != 0:
            print(minikube.stderr)
            raise Exception("Error while starting minikube")

    print("Completed teardown!")

def uninstall(server_version=None, server_path=None):
    if server_path is None:
        _, server_path = get_launch_paths(server_version, None)

    server_executable = os.path.basename(server_path)
    if platform.system() != 'Windows':
        server_executable = f"./{server_executable}"
    else:
        server_executable = server_path

    try:
        server = subprocess.Popen([server_executable, "--uninstall"],stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=os.path.dirname(server_path))
    except:
        raise Exception(f"Error occurred while uninstalling")

    server_stdout_thread = threading.Thread(target=read_output, args=(server, '[server]'))
    server_stderr_thread = threading.Thread(target=read_error, args=(server, '[server]'))
    server_stdout_thread.start()
    server_stderr_thread.start()
    server_stdout_thread.join()
    server_stderr_thread.join()

def check_expected_services(config):
    is_local = config["IsLocal"]
    print(config)
    if is_local:
        local = config["Local"]
        ports = [local["RegistryPort"]]

        for port in ports:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)  # Set a timeout of 1 second

            try:
                sock.bind(('localhost', int(port)))

                raise Exception(f"Was able to bind to {port}, which means kube services are not running correctly. Please re-run `zetaforge setup`.")
            except socket.error as e:
                if e.errno == errno.EADDRINUSE:
                    print(f"Service running at port {port}")
            finally:
                sock.close()

    return True

def create_config_json(s2_path, context, driver, is_dev):
    config = {
        "IsLocal":True,
        "IsDev": is_dev,
        "ServerPort": 8080,
        "KanikoImage":"gcr.io/kaniko-project/executor:latest",
        "WorkDir":"/app",
        "FileDir":"/files",
        "ComputationFile":"computations.py",
        "EntrypointFile":"entrypoint.py",
        "ServiceAccount":"executor",
        "Bucket":"forge-bucket",
        "BucketName": "zetaforge",
        "Database":"./zetaforge.db",
        "KubeContext": context,
        "SetupVersion":"1",
        "Local": {
            "BucketPort": 8333,
            "Driver": driver
        }
    }

    file_path = os.path.join(s2_path, "config.json")
    with open(file_path, "w") as outfile:
        json.dump(config, outfile)

    return file_path
