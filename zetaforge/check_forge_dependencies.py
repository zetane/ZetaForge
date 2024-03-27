import subprocess
import platform
from pathlib import Path
import os
EXECUTABLES_PATH = os.path.join(Path(__file__).parent, 'executables')

def check_s2_executable(s2_version=None):
    filename = f"s2-{s2_version}"
    if platform.system() == 'Windows':
        filename += '.exe'
        return filename
    else:
        machine = platform.machine()
        if machine == 'x86_64' or machine == 'x86-64':
            filename += '-amd64'
            filename = './' + filename
        else:
            filename += '-arm64'
            filename += './' + filename
    return filename
    # file_full_path = os.path.join(EXECUTABLES_PATH, filename)
    # path = Path(file_full_path)
    # if path.is_file():
    #     return True, filename
    # else:
    #     return False, filename

def check_kubectl():
    
    check_ctl = subprocess.run("kubectl version --client", shell=True)
    
    if check_ctl.returncode != 0:
        return False #returns false
    return True



def check_dependencies():
    kubectl_flag = check_kubectl()
    
    return kubectl_flag

def check_docker_installed():
    docker =subprocess.run("docker", shell=True)
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
    

