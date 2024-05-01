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
from .mixpanel_client import MixpanelClient


mixpanel_client = MixpanelClient('4c09914a48f08de1dbe3dc4dd2dcf90d')


BUILD_YAML = resource_filename("zetaforge", os.path.join('utils', 'build.yaml'))
INSTALL_YAML = resource_filename("zetaforge", os.path.join('utils', 'install.yaml'))

EXECUTABLES_PATH = os.path.join(Path(__file__).parent, 'executables')
FRONT_END = os.path.join(EXECUTABLES_PATH, "frontend")

def write_json(server_version, client_version, context, registry_port, driver, s2_path=None):
    if s2_path:
        server_path = s2_path
    else:
        _, server_path = get_launch_paths(server_version, client_version)
    config = create_config_json(os.path.dirname(server_path), context, registry_port, driver)
    return config


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

    # Print the contexts for the user
    print("Available kubectl contexts:")
    for i, context in enumerate(contexts, start=1):
        if context.startswith("*"):
            print(f"{i}. {context[1:]} (current)")
        else:
            print(f"{i}. {context}")
    
    return contexts

def select_kubectl_context():
    # Get the list of kubectl contexts
    contexts = get_kubectl_contexts()

    # Prompt the user to select a context
    while True:
        try:
            choice = int(input("Enter the number of the context you want to use: "))
            if 1 <= choice <= len(contexts):
                break
            else:
                print("Invalid choice. Please try again.")
        except ValueError:
            print("Invalid input. Please enter a valid number.")

    selected_context = contexts[choice - 1].strip("* ")

    # Confirm the selected context with the user
    confirmation = input(f"You have selected the context: {selected_context}. Is this correct? (y/n): ")
    if confirmation.lower() != "y":
        print("Context selection canceled.")
        return None

    return selected_context

def setup(server_version, client_version, build_flag = True, install_flag = True, server_path = None, mount = None):
    print("Platform: ", platform.machine())
    print("CWD: ", os.path.abspath(os.getcwd()))

    registry_port = find_available_port(32000, 64000)
    print(f"Setting registry port: {registry_port}")
    update_yaml(int(registry_port))

    if mount is None:
        driver = "orbstack"
        context = select_kubectl_context()
        kubectl_flag = check_kubectl()        

        switch_context = None
        if kubectl_flag:
            switch_context = subprocess.run(["kubectl", "config", "use-context", f"{context}"], capture_output=True, text=True)
        else:
            print("Kubectl not found. Please install docker-desktop and enable kubernetes, or ensure that kubectl installed and is able to connect to a working kubernetes cluster.")
            raise EnvironmentError("Kubectl not found!")
        #install_kubectl()
        #switch_context = subprocess.run(f"./kubectl config use-context {context}", shell=True, cwd=EXECUTABLES_PATH)

        in_context = (switch_context.returncode == 0)

        if not in_context:
            print(f"Cannot find the context {context} for kubernetes. Please double check that you have entered the correct context.")        
            subprocess.run(["kubectl", "config", "get-contexts"], capture_output=True, text=True)
            raise Exception("Exception while setting the context")

        running_kube = check_running_kube(context)
        if not running_kube:
            raise Exception("Kubernetes is not running, please start kubernetes and ensure that you are able to connect to the kube context.")

        build = subprocess.run(["kubectl", "apply", "-f", f"{BUILD_YAML}"], capture_output=True, text=True)
        install = subprocess.run(["kubectl", "apply", "-f", f"{INSTALL_YAML}"], capture_output=True, text=True)

        if build.returncode != 0 or install.returncode != 0:
            raise Exception("Error while building")

        time.sleep(3)
        name = "k8s_registry"
        container_id = check_for_container(name)

        if not container_id:
            print("Registry is not running, please verify that docker and kubernetes are running and re-run the setup process.")
            raise Exception("Error detecting container registry")
    else:
        context = "zetaforge"
        driver = "minikube"
        if not check_minikube():
            print("Minikube not found. Please install minikube.")
            raise Exception("Minikube not found!")
        minikube = subprocess.run(["minikube", "start", "--mount-string=" + mount + ":/host", "--mount", "-p", "zetaforge"], capture_output=True, text=True)
        if minikube.returncode != 0:
            print(minikube.stderr)
            raise Exception("Error while starting minikube")

    install_frontend_dependencies(client_version=client_version)

    config_path = write_json(server_version, client_version, context, registry_port, server_path, driver)

    print(f"Setup complete, wrote config to {config_path}.")
        
    return config_path


#dev version is only passed, when a developer wants to pass a local version(for e.g. dev_path=./s2-v2.3.5-amd64)
def run_forge(server_version=None, client_version=None, server_path=None, client_path=None, mount = None):
    global time_start
    time_start = datetime.now()

    #init is called for collarama library, better logging.
    init()   

    if mount is None:
        reg = check_kube_pod("registry")
        if not reg:
            print("Registry container not found, restarting..")
            setup(server_version, client_version)
            raise Exception("Container registry is not running, please ensure kubernetes is running or re-run `zetaforge setup`.")
        weed = check_kube_pod("weed")
        if not weed:
            raise Exception("SeaweedFS is not running, please ensure kubernetes is running or re-run `zetaforge setup`.")

    mixpanel_client.track_event('Initial Launch')

    if server_path is None:
        _, server_path = get_launch_paths(server_version, client_version)

    if client_path is None:
        client_path, _ = get_launch_paths(server_version, client_version)

    try:
        server = None
        client = None
        print(f"Launching execution server {server_path}..")
        server_executable = os.path.basename(server_path)
        if platform.system() != 'Windows':
            server_executable = f"./{server_executable}"
        else:
            server_executable = server_path
        
        server = subprocess.Popen([server_executable],stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=os.path.dirname(server_path))

        print(f"Launching client {client_path}..")
        client_executable = os.path.basename(client_path)
        if platform.system() == 'Darwin':
            client_executable = [f"./{client_executable}"]
        elif platform.system() == 'Windows':
            client_executable = [client_path, '--no-sandbox']
        else: 
            client_executable = [f"./{client_executable}"]

        client = subprocess.Popen(client_executable, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=os.path.dirname(client_path))

        def read_output(process, name):
            for line in process.stdout:
                print(f"{name}: {line.decode('utf-8')}", end='')

        def read_error(process, name):
            for line in process.stderr:
                print(f"{name} (stderr): {line.decode('utf-8')}", end='')

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

    except KeyboardInterrupt: 
        print("Terminating servers..")

    finally:
        total_time = (datetime.now() - time_start).total_seconds()

        try:
            mixpanel_client.track_event('Full Launch', props={'Duration(seconds)': total_time})
            time.sleep(2) # mixpanel instance is asynch, so making sure that it completes the call before tear down
        except:
            print("Mixpanel cannot track")

        server.kill()
        client.kill()


#purge executables, and upload them from the scratch
def purge():
    shutil.rmtree(EXECUTABLES_PATH)
    os.makedirs(EXECUTABLES_PATH)

def teardown(mount = None):
    if mount is None:
        contexts = get_kubectl_contexts()
        default = None
        for i, context in enumerate(contexts, start=1):
            if context.startswith("*"):
                default = context[1:]
    
        print("Tearing down services..")
        if default and default == "docker-desktop":
            stop = subprocess.run(["kubectl", "stop", "registry"], capture_output=True, text=True)
            print(stop.stdout)

        install = subprocess.run(["kubectl", "delete", "-f", INSTALL_YAML], capture_output=True, text=True)
        print ("Removing install: ", {install.stdout})
        build = subprocess.run(["kubectl", "delete", "-f", BUILD_YAML], capture_output=True, text=True)
        print("Removing build: ", {build.stdout})
    else:
        minikube = subprocess.run(["minikube", "stop", "-p", "zetaforge"], capture_output=True, text=True)
        if minikube.returncode != 0:
            print(minikube.stderr)
            raise Exception("Error while starting minikube")
    print("Completed teardown!")


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

                raise Exception(f"Was able to bind to {port}, which means kube services are nto running correctly. Please re-run `zetaforge setup`.")
            except socket.error as e:
                if e.errno == errno.EADDRINUSE:
                    print(f"Service running at port {port}")
            finally:
                sock.close()
    
    return True 

def create_config_json(s2_path, context, registry_port=5000, driver="orbstack"):
    config = {
        "IsLocal":True,
        "ServerPort": 8080,
        "KanikoImage":"gcr.io/kaniko-project/executor:latest",
        "WorkDir":"/app",
        "FileDir":"/files",
        "ComputationFile":"computations.py",
        "EntrypointFile":"entrypoint.py",
        "ServiceAccount":"executor",
        "Bucket":"forge-bucket",
        "Database":"./zetaforge.db",
        "KubeContext": context,
        "Local": {
            "BucketPort": 8333,
            "RegistryPort": registry_port,
            "RegistryDomain":"example.org",
            "Driver": driver
        }
    } 

    file_path = os.path.join(s2_path, "config.json")
    with open(file_path, "w") as outfile: 
        json.dump(config, outfile)

    return file_path

def generate_distinct_id():
    seed = 0
    try:
        seed = uuid.getnode()
    except:
        seed = 0
        
    distinct_id = sha256(str(seed).encode('utf-8')).hexdigest()
    return distinct_id
