
import requests
import platform
import subprocess
import gzip
import boto3
import os
import shutil
from pkg_resources import resource_filename 
from pathlib import Path
from botocore.client import Config
from botocore import UNSIGNED
from pathlib import Path
import time
import ssl
import progressbar
import os
import platform
import sys

# BACKEND = resource_filename("")
EXECUTABLES_PATH = os.path.join(Path(__file__).parent, 'executables')
ssl._create_default_https_context = ssl._create_unverified_context

s3 = boto3.client('s3', config=Config(signature_version=UNSIGNED), region_name='us-east-2')
def install_kubectl():
    
    try:

        stable_release_url = "https://dl.k8s.io/release/stable.txt"
        response = requests.get(stable_release_url)
        stable_release = None
        kubectl_url = None
        if response.status_code == 200:
                    
            stable_release = response.text.strip()

        if platform.system() == 'Darwin':
            if platform.machine() == 'x86_64' or platform.machine() == 'x86-64':
                print("Installing for Intel Chip")
                kubectl_url = f"https://dl.k8s.io/release/{stable_release}/bin/darwin/amd64/kubectl"
            else:
                print("Installing for Apple M1 chip")
                kubectl_url = f"https://dl.k8s.io/release/{stable_release}/bin/darwin/arm64/kubectl"
            

            download_content(kubectl_url, os.path.join(EXECUTABLES_PATH, "kubectl") )
            subprocess.run("chmod +x ./kubectl", shell=True, cwd=EXECUTABLES_PATH)
            

            result = subprocess.run("./kubectl version --client", shell=True, cwd=EXECUTABLES_PATH)
            if result.returncode != 0:
                raise Exception("There was an error while downloading kubectl. Please try again") 
            
        elif platform.system() == 'Windows':
            # subprocess.run("curl.exe -LO \"https://dl.k8s.io/release/v1.28.3/bin/windows/amd64/kubectl.exe\"", shell=True)
            kubectl_url = f"https://dl.k8s.io/release/{stable_release}/bin/windows/amd64/kubectl.exe"

            download_content(kubectl_url, os.path.join(EXECUTABLES_PATH, "kubectl.exe"))

            
            result = subprocess.run("kubectl.exe version --client", shell=True, cwd=EXECUTABLES_PATH)
            if result.returncode != 0:
                raise Exception("There was an error while downloading kubectl. Please try again")
        elif platform.system() == 'Linux':
            machine = platform.machine()
            if machine == 'x86_64' or machine == 'x86-64':
                kubectl_url = f"https://dl.k8s.io/release/{stable_release}/bin/linux/amd64/kubectl"
            else:
                kubectl_url = f"https://dl.k8s.io/release/{stable_release}/bin/linux/arm64/kubectl"

            download_content(kubectl_url, os.path.join(EXECUTABLES_PATH, "kubectl"))
            
            
            subprocess.run("chmod +x kubectl", shell=True, cwd=EXECUTABLES_PATH)

            result = subprocess.run("./kubectl version --client", shell=True, cwd=EXECUTABLES_PATH)
            if result != 0:
                raise Exception("There was an error while downloading kubectl. Please try again")
        else:
            raise Exception("Unknown Platform")
    except:
        raise Exception("EXCEPTION WHILE SETTING KUBECTL")

def download_content(url, filename):
    
    response = requests.get(url)
    if response.status_code == 200:
        with open(filename, "wb") as f:
            f.write(response.content)
            print("Binary downloaded successfully.")
    else:
        print(f"Failed to download {filename} binary. Status code: {response.status_code}")
        raise Exception("Error while downloading kubectl")


def gunzip_file(in_file, out_file):
    with gzip.open(in_file, 'rb') as f_in:
        with open(out_file, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)

def get_s2_executable(filename):
    

    chmod_flag = True
    bucket_name = 'forge-executables-test'
     
    
    if platform.system() == 'Windows':
        chmod_flag = False
    filename = filename.replace("./", "")
    file_dir = os.path.join(EXECUTABLES_PATH, filename)
    try:
        s3.download_file(bucket_name, filename, file_dir)  
        if chmod_flag:
            subprocess.run(f"chmod +x {filename}", shell=True, cwd=EXECUTABLES_PATH)
        print(f"File '{file_dir}' downloaded successfully.")
    except Exception as e:
        print("EXCEPTION HAPPENED")
        print(f"Error: {e}")


def generate_file_names(app_version='0.0.1'):
    bucket_key = "zetaforge-" + app_version
    key_file = EXECUTABLES_PATH
    platform_ = platform.system()
    machine = platform.machine()
    zip_dir = os.path.join(EXECUTABLES_PATH, "zetaforge.zip")
    unzip = ['unzip', 'zetaforge.zip']
    if platform_ == 'Windows':
        app_dir = os.path.join(EXECUTABLES_PATH, "zetaforge", "win-unpacked")

        bucket_key += '-windows'
        return f"{bucket_key}.zip", zip_dir, ['powershell', "expand-archive", "zetaforge.zip"], app_dir
    elif platform_ == 'Linux':
        app_dir = os.path.join(EXECUTABLES_PATH, "zetaforge", "linux-unpacked")

        bucket_key += '-linux'
        if machine == 'x86_64' or machine == 'x86-64':
            bucket_key += '-amd64'
        else:
            bucket_key += '-arm64'
        return f"{bucket_key}.zip", zip_dir, unzip, app_dir
    else:
        app_dir = os.path.join(EXECUTABLES_PATH, "zetaforge.app")

        bucket_key += '-darwin'
        if machine == 'x86_64' or machine == 'x86-64':
            bucket_key += '-amd64'
        else:
            bucket_key += '-arm64'
        return f"{bucket_key}.zip", zip_dir, unzip, app_dir







def install_frontend_dependencies(app_version="0.0.1"):
    bucket = "forge-executables-test"

    bucket_key, zip_dir, unzip, app_dir = generate_file_names(app_version=app_version)
    if os.path.exists(app_dir) and os.path.isdir(app_dir):
        print("Frontend exist")
        return
    try:
        meta_data = s3.head_object(Bucket=bucket, Key=bucket_key)
        total_length = int(meta_data.get('ContentLength', 0))
        downloaded = 0
        def progress(chunk):
            nonlocal downloaded
            downloaded += chunk
            done = int(50 * downloaded / total_length)
            sys.stdout.write("\r[%s%s]" % ('=' * done, ' ' * (50-done)) )
            sys.stdout.flush()
        print("DOWNLOADING APP")
        s3.download_file(bucket, bucket_key, zip_dir, Callback=progress)
        print("APP DOWNLOAD COMPLETED")
    except Exception as err:
        print(err)
    
    result = subprocess.Popen(unzip, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd=EXECUTABLES_PATH)
    result.communicate()


            

                

        



        


#NOTE THAT THIS IS SUBJECT TO CHANGE, ONCE WE HAVE THE OPEN SOURCE CODE. FOR NOW, IT FETCHES FROM PRIVATE REPO(gitlab)
# def init_git():
#     front_end = os.path.join(EXECUTABLES_PATH, 'frontend')
#     subprocess.run("git init", cwd=EXECUTABLES_PATH, shell=True)
#     subprocess.run("git remote add origin https://gitlab.com/zetane/zetaforge.git", cwd=EXECUTABLES_PATH, shell=True)
#     subprocess.run("git config core.sparseCheckout true", cwd=EXECUTABLES_PATH, shell=True)
#     info = os.path.join(EXECUTABLES_PATH, ".git", "info")
#     os.makedirs(os.path.join(EXECUTABLES_PATH, ".git", "info"), exist_ok=True)
#     with open(os.path.join(EXECUTABLES_PATH , ".git", "info", "sparse-checkout"), "w") as f:
#         f.write("frontend/\nblocks/\nhistory/\nmy_data\nmy_pipelines\npipelines\nmy_data\nmy_blocks\n") 
#     subprocess.run("git pull origin master", cwd=EXECUTABLES_PATH, shell=True)
#     subprocess.run("npm install", cwd=front_end, shell=True)
#     env = os.path.join(front_end, '.env.development')
    

# def deinit_git():
#     subprocess.run("rm -rf .git", cwd=EXECUTABLES_PATH, shell=True)








            





    


        