import os
import subprocess
import platform
import time
import json
from pkg_resources import resource_filename
from .check_forge_dependencies import check_dependencies, check_docker_installed, check_s2_executable
from .install_forge_dependencies import *
import webbrowser
from pathlib import Path
import docker
from colorama import init, Fore, Style
from datetime import datetime
import mixpanel
from cryptography.fernet import Fernet
import socket
import base64
import uuid
from hashlib import sha256
import json
import re
import shutil
import threading
import queue
import sys
import yaml 


mixpanel_token = '4c09914a48f08de1dbe3dc4dd2dcf90d'
mixpanel_instance = mixpanel.Mixpanel(mixpanel_token)

BUILD_YAML = resource_filename("zetaforge", os.path.join('utils', 'build.yaml'))
INSTALL_YAML = resource_filename("zetaforge", os.path.join('utils', 'install.yaml'))

EXECUTABLES_PATH = os.path.join(Path(__file__).parent, 'executables')
FRONT_END = os.path.join(EXECUTABLES_PATH, "frontend")



def find_available_port(start_port, end_port):
    for port in range(start_port, end_port + 1):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', port))
            return port
        except OSError:
            pass
    return None


def update_yaml(port):
    d = None
    yaml_doc = None
    with open(BUILD_YAML) as f:
        yaml_doc = list(yaml.safe_load_all(f))
        d = yaml_doc[-1]

    d['spec']['ports'][0]['port'] = port
    yaml_doc[-1] = d

    with open(BUILD_YAML, "w") as f:
        yaml.dump_all(yaml_doc, f, default_flow_style=False)

def setup(context):
    print(platform.machine())
    print(os.path.abspath(os.getcwd()))
    kubectl_flag = check_dependencies()        
    port = find_available_port(5000, 7000)
    update_yaml(port)

        
    switch_context = None
    if kubectl_flag:
        switch_context = subprocess.run(f"kubectl config use-context {context}", shell=True)
    else:
        install_kubectl()
        switch_context = subprocess.run(f"./kubectl config use-context {context}", shell=True, cwd=EXECUTABLES_PATH)

        
    if switch_context.returncode != 0:
        print(f"Cannot find the context {context} for kubernetes. Please double check that you have entered the correct context.")        
        subprocess.run("kubectl config get-contexts", shell=True)
        raise Exception("Exception while setting the context")

        
        
    build = None
    install = None
    if kubectl_flag:
        build = subprocess.run(f"kubectl apply -f {BUILD_YAML}", shell=True)
        install = subprocess.run(f"kubectl apply -f {INSTALL_YAML}", shell=True)
    else:
        build = subprocess.run(f"./kubectl apply -f {BUILD_YAML}", shell=True, cwd=EXECUTABLES_PATH)
        install = subprocess.run(f"./kubectl apply -f {INSTALL_YAML}", shell=True, cwd=EXECUTABLES_PATH)


    if build.returncode != 0 or install.returncode != 0:
        raise Exception("Error while building")
        
        
        
        
    name = "k8s_registry"
    container_id = ""
    while True:
            
        ls_cmd = subprocess.Popen(["docker", "container", "ls",'--format', 'json'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
           
            
        output, stderr = ls_cmd.communicate()

        if output:
            output_str = output
            output_list = output_str.splitlines()
                
            for container_str in output_list:
                if container_str.strip():
                    container = json.loads(container_str.strip())
                if container['Names'].startswith(name):
                    container_id = container['ID']
                    break
            if container_id:
                break
            
        if container_id: #sanity check
            break
        time.sleep(1)
        
    container_id = container_id
        
    ins_cmd = subprocess.Popen(["docker", "inspect", container_id], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = ins_cmd.communicate()
        
    json_data = json.loads(stdout.decode('utf-8'))[0]
    volumename = ""
    for item in json_data.get("Mounts", []):
        volumetype = item.get("Type", "")
        if volumetype == 'volume':
            volumename = item.get("Name", "")
        
    register_cmd = subprocess.Popen(["docker", "run", "--rm", "--name", "registry", "-p", f"{port}:5000", "-v", f"{volumename}:/var/lib/registry", "registry:2"])
    
    return kubectl_flag, port


def run_forge(context, s2_version=None, dev_path=None, dev_flag=None, app_version='0.0.1', s2_path=None, frontend_path=None):
    
    doc = check_docker_installed()
    if doc != 0:
        raise Exception("Docker not found! Please install docker.")

    
    #mixpanel_instance.track(distinct_id,'Initial Launch')
    distinct_id = generate_distinct_id()
    #added this for funnel reviews(for e.g., user Launched and after created a run, loaded a pipeline etc.)
    mixpanel_instance.track(distinct_id, "Initial Launch", {})

    kubectl_flag, port = setup(context)
    print(f"REGISTRY CONTAINER USES PORT {port}")
    try:

        while True:
            
            check_command = subprocess.Popen(["docker", "inspect", "registry"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            check_command.wait()
            if len(check_command.stdout.read()) > 0:
                break
            time.sleep(1)

        #STEP 1: CHECK IF A DEV INSTANCE IS PASSED
        s2 = None
        app = None
        if s2_path:
            print("RUNNING LOCAL SERVER2")
            s2 = subprocess.Popen([s2_path],stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=os.path.dirname(s2_path))
        #STEP 2: IF NOT, CHECK IF THE COMPATIBLE VERSION ALREADY EXISTS LOCALLY

        if frontend_path:
            print("RUNNING LOCAL FRONTEND")
            app = subprocess.Popen([frontend_path],stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=os.path.dirname(frontend_path))

        
            #NOTE: server2 is now embedded within frontend, keeping the commented section as a reference, in case we ever decide to rollback to the older approach
            # file_exist, filename = check_s2_executable(s2_version=s2_version)
            # if file_exist:
            #     print("FILE ALREADY EXIST. RUNNING FROM EXISTING EXECUTABLE")
                
            #     print(filename)
            #     s2 = subprocess.Popen([filename],stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=EXECUTABLES_PATH, shell=True)
            # else:
            #     get_s2_executable(filename)
            #     print(filename)
            #     print("THIS IS EXECUTABLES PATH")
            #     s2 = subprocess.Popen([filename],stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=EXECUTABLES_PATH, shell=True)
                  
        filename = check_s2_executable(s2_version) #need to change the function name
        
        if platform.system() == 'Darwin':
            app_dir = os.path.join(EXECUTABLES_PATH, "zetaforge.app", "Contents", "MacOS")
            app_path = os.path.join(app_dir, "zetaforge")
            s2_path = os.path.join(EXECUTABLES_PATH, "zetaforge.app", "Contents" ,"Resources", "server2")
            create_config_json(s2_path, port)

            if app == None:
                app = subprocess.Popen(app_path, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=app_dir)
            time.sleep(5)
            if s2 == None:
                s2 = subprocess.Popen([filename],stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=s2_path, shell=True)
        elif platform.system() == 'Windows':
            app_path = os.path.join(EXECUTABLES_PATH, "zetaforge", "win-unpacked", "zetaforge.exe")
            app_dir = os.path.join(EXECUTABLES_PATH, "zetaforge", "win-unpacked")
            
            s2_path = os.path.join(app_dir, "resources", "server2")
            create_config_json(s2_path, port)
            if app == None:
                app = subprocess.Popen(app_path, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=EXECUTABLES_PATH, shell=True)
            time.sleep(5)
            if s2 == None:
                s2 =  subprocess.Popen([os.path.join(s2_path, filename)],stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=s2_path, shell=True)
        else:
            app_path = os.path.join(EXECUTABLES_PATH, "zetaforge", "linux-unpacked", "zetaforge.exe")
            app_dir = os.path.join(EXECUTABLES_PATH, "zetaforge", "linux-unpacked")
            s2_path = os.path.join(app_dir, "resources", "server2")
            create_config_json(s2_path, port)
            if app == None:
                app = subprocess.Popen(app_path, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=EXECUTABLES_PATH, shell=True)
            if s2 == None:
                s2 =  subprocess.Popen([filename],stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=s2_path, shell=True)



        


        def enqueue_output(out, queue):
            for line in iter(out.readline, b''):
                queue.put(line)
                

        s2_queue = queue.Queue()
        app_queue = queue.Queue() 

        #using threading to prevent deadlocks
        s2_thread = threading.Thread(target=enqueue_output, args=(s2.stdout, s2_queue))
        app_thread = threading.Thread(target=enqueue_output, args=(app.stdout, app_queue))

        s2_thread.start()
        app_thread.start()
        app_open = False
        while True:
        # Check if there is any output from s2 subprocess
            while not s2_queue.empty():
                line = s2_queue.get()
                if not line.decode('utf-8') == '\n':
                    print(f"{Fore.BLUE}[s2] {line.decode('utf-8')}")
                    time.sleep(0.5)
            time.sleep(1)
        # Check if there is any output from app subprocess
            while not app_queue.empty():
                line = app_queue.get()
                if not line.decode('utf-8') == '\n':
                    pattern = re.compile(r'localhost:(\d+)')
                    match = pattern.findall(line.decode('utf-8'))
                    if match and not app_open:
                        port_number = int(match[0])
                        app_open=True
                    print(f"{Fore.YELLOW}[app] {line.decode('utf-8')}")
                    time.sleep(0.5)
            time.sleep(1)
        
            
            time.sleep(5)
        s2.wait()
    except KeyboardInterrupt: 
        
        print(f"{Style.RESET_ALL}Teardown Process will start now")
        
        total_time = (datetime.now() - time_start).total_seconds()
        distinct_id = generate_distinct_id()


        try:
            mixpanel_instance.track(distinct_id,'Full Launch', {'Duration(seconds)': total_time})
            time.sleep(5) # mixpanel instance is asynch, so making sure that it completes the call before tear down
        except:
            print("Mixpanel cannot track")
    finally:
        teardown = input("Do you wish to teardown your containers?[Y/N]")
        if teardown.lower() == 'y':


        
        
            subprocess.Popen(["docker", "stop", "registry"])
            # subprocess.Popen(["docker", "stop", "forgeDB"])
            if kubectl_flag:
                subprocess.run(f"kubectl delete -f {INSTALL_YAML}", shell=True)
                subprocess.run(f"kubectl delete -f {BUILD_YAML}", shell=True)
            else:
                subprocess.run(f"./kubectl delete -f {INSTALL_YAML}", shell=True)
                subprocess.run(f"./kubectl delete -f {BUILD_YAML}", shell=True)
        else:
            print("Containers won't be teared down. Please run zetaforge teardown for deleting your containers")

#purge executables, and upload them from the scratch
def purge():
    shutil.rmtree(EXECUTABLES_PATH)
    os.makedirs(EXECUTABLES_PATH)


def teardown():
    subprocess.Popen(["docker", "stop", "registry"])
        # subprocess.Popen(["docker", "stop", "forgeDB"])
    kubectl_flag = check_dependencies()
    if kubectl_flag:
        subprocess.run(f"kubectl delete -f {INSTALL_YAML}", shell=True)
        subprocess.run(f"kubectl delete -f {BUILD_YAML}", shell=True)
    else:
        subprocess.run(f"./kubectl delete -f {INSTALL_YAML}", shell=True)
        subprocess.run(f"./kubectl delete -f {BUILD_YAML}", shell=True)



def add_psql():
    check_cmd = "docker ps -a --filter name=forgeDB --format '{{.Names}}'"
    result = subprocess.run(check_cmd, shell=True, capture_output=True, text=True)
    
    
    
    if result.stdout.strip().replace("'", "") == 'forgeDB': 
        
        restart_cmd = "docker restart forgeDB"
        subprocess.run(restart_cmd, shell=True)
    else:
        subprocess.run("docker pull postgres", shell=True)
        subprocess.run("docker run -d --name forgeDB -p 5432:5432 -e POSTGRES_PASSWORD=pass123 -v forge_data:/var/lib/postgresql/data postgres", shell=True)








#dev version is only passed, when a developer wants to pass a local version(for e.g. dev_path=./s2-v2.3.5-amd64)



# all the optional parameters must be passed in _init_.py.
def launch_forge(context, s2_version=None, dev_path=None, dev_flag=False, app_version=None, s2_path=None, app_path=None):
    global time_start
    time_start = datetime.now()
    os.makedirs(EXECUTABLES_PATH, exist_ok=True)
    
    #init is called for collarama library, better logging.
    init()   
    # there's no direct way to check for kubernetes. So, I am warning them to check for their kubernetes.
    answer = input(f"{Fore.BLUE}{Style.BRIGHT}Please check if docker desktop is running, and enable kubernetes before prooceeding. Click any button to continue")

    docker_dektop = check_docker_desktop()
    if not docker_dektop:
        Exception("Docker Desktop is not running. Please launch docker desktop and enable kubernetes.")
    
    #if the app_path is defined, we're bypassing installation.
    if app_path == None:
        install_frontend_dependencies(app_version=app_version)
    
    run_forge(context, s2_version=s2_version, dev_path=dev_path, dev_flag=dev_flag, app_version=app_version, s2_path=s2_path, frontend_path=app_path)
    

def check_docker_desktop():
    
    try:
        client = docker.from_env()
        client.ping()
        return True
    except docker.errors.DockerException:
        return False


#method for creating config.json file
def create_config_json(s2_path, port=5000):
    config = {
	"IsLocal":True,
	"ServerPort":"8080",
	"KanikoImage":"gcr.io/kaniko-project/executor:latest",
	"WorkDir":"/app",
	"FileDir":"/files",
	"ComputationFile":"computations.py",
	"EntrypointFile":"entrypoint.py",
	"ServiceAccount":"executor",
	"Bucket":"forge-bucket",
	"Database":"./zetaforge.db",

	"Local": {
		"BucketPort":"8333",
		"RegistryPort": str(port)
	}
} 


    file = os.path.join(s2_path, "config.json")
    with open(file, "w") as outfile: 
        json.dump(config, outfile)


def generate_distinct_id():
    
    seed = 0
    try:
        seed = uuid.getnode()
    except:
        seed = 0
        
    distinct_id = sha256(str(seed).encode('utf-8')).hexdigest()
    return distinct_id