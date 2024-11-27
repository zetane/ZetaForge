import subprocess
import platform
from pathlib import Path
import os
from zetaforge.logger import CliLogger

EXECUTABLES_PATH = os.path.join(Path(__file__).parent, 'executables')

logger = CliLogger()

def check_kubectl():
    check_ctl = subprocess.run(["kubectl", "version", "--client"], capture_output=True, text=True)
    return check_ctl.returncode == 0

def check_running_kube(context):
    check_kube = subprocess.run(["kubectl", f"--context={context}", "get", "pods"], capture_output=True, text=True)
    if check_kube.returncode == 0:
        logger.success("Kubernetes is running, continuing..")
        return True
    else:
        logger.error(f"Kubernetes is not running! {check_kube.stderr}")
        return False

def check_kube_pod(name):
    check_kube = subprocess.run(["kubectl", "get", "pods"], capture_output=True, text=True)
    lines = check_kube.stdout.strip().split("\n")[1:]  # Skip the header line
    for line in lines:
        parts = line.split("-")
        if parts[0] == name:
            return True

    return False

def check_kube_svc(name, namespace="default"):
    check_kube = subprocess.run(["kubectl", f"--namespace={namespace}", "get", "svc"], capture_output=True, text=True)
    print(check_kube)
    lines = check_kube.stdout.strip().split("\n")[1:]  # Skip the header line
    for line in lines:
        print(line)
        parts = line.split(" ")
        if parts[0].strip() == name:
            return True

    return False

def check_minikube():
    check_ctl = subprocess.run(["minikube", "version"], capture_output=True, text=True)
    return check_ctl.returncode == 0

def check_docker_installed():
    docker = subprocess.run("docker", capture_output=True, text=True)
    if docker.returncode != 0:
        print("Please install docker desktop to your computer:")
        if platform.system() == 'Windows':
            print("https://docs.docker.com/desktop/install/windows-install/")
        elif platform.system() == 'Darwin':
            print("https://docs.docker.com/desktop/install/mac-install/")
        else:
            print("https://docs.docker.com/desktop/install/linux-install/")
        return -1
    return 0
