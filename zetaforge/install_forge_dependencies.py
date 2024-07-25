import requests
import platform
import subprocess
import gzip
import boto3
import os
import shutil
from pathlib import Path
from botocore.client import Config
from botocore import UNSIGNED
from pathlib import Path
import ssl
import os
import platform
import sys
from zipfile import ZipFile
import tarfile
from .check_forge_dependencies import check_kube_svc
from pkg_resources import resource_filename

# BACKEND = resource_filename("")
EXECUTABLES_PATH = os.path.join(Path(__file__).parent, 'executables')
ssl._create_default_https_context = ssl._create_unverified_context

BUILD_YAML = resource_filename("zetaforge", os.path.join('utils', 'build.yaml'))
INSTALL_YAML = resource_filename("zetaforge", os.path.join('utils', 'install.yaml'))

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

def extract_zip(zip_file, target_dir):
    if platform.system() != "Darwin":
        with ZipFile(zip_file, 'r') as f:
            for file_info in f.infolist():
                file_path = os.path.join(target_dir, file_info.filename)
                print(".", end="")

                if file_info.is_dir():
                    os.makedirs(file_path, exist_ok=True)
                elif file_info.filename.endswith('/'):
                    # Handle symbolic links
                    link_name = os.path.basename(file_info.filename[:-1])
                    link_target = zip_file.read(file_info).decode('utf-8')
                    link_path = os.path.join(target_dir, link_name)
                    os.symlink(link_target, link_path)
                else:
                    f.extract(file_info, target_dir)
                    try:
                        os.chmod(file_path, file_info.external_attr >> 16)
                    except Exception as e:
                        print(f"Failed to update permissions of {file_path}")
                        print(e)

    elif platform.system() == "Darwin":
        unzip = subprocess.run(["unzip", zip_file], capture_output=True, text=True)
        print(unzip.stdout)


def extract_tar(tar_file, target_dir):
    with tarfile.open(tar_file, 'r') as tar:
        print(f"Extracting {tar_file} to {target_dir}")
        tar.extractall(target_dir)

    print(f"\nExtraction completed.")

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


def get_download_file(client_version):
    bucket_key = "ZetaForge-" + client_version
    machine = platform.machine()
    if platform.system() == 'Windows':
        bucket_key += '-windows-x64'
        bucket_key += ".tar.gz"
        return bucket_key
    elif platform.system() == 'Linux':
        bucket_key += '-linux'
        if machine == 'x86_64' or machine == 'x86-64':
            bucket_key += '-x64'
        else:
            bucket_key += '-arm64'
        bucket_key += ".tar.gz"
        return bucket_key
    else:
        bucket_key += '-darwin'
        if machine == 'x86_64' or machine == 'x86-64':
            bucket_key += '-x64'
        else:
            bucket_key += '-arm64'
        bucket_key += ".tar.gz"
        return bucket_key

def get_server_executable(s2_version=None):
    filename = f"s2-{s2_version}"
    if platform.system() == 'Windows':
        filename += '.exe'
        return filename
    else:
        machine = platform.machine()
        if machine == 'x86_64' or machine == 'x86-64':
            filename += '-amd64'
        else:
            filename += '-arm64'
    return filename

def check_and_clean_files(directory, version):
    for filename in os.listdir(directory):
        file_parts = filename.split('-')
        if len(file_parts) >= 2:
            file_version = file_parts[1]
            if file_version == version:
                print(f"Found an existing install of version {version}")
            else:
                print(f"Found a previous version of forge, uninstalling..")


                file_path = os.path.join(directory, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    print(f"Removed file: {filename}")
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
                    print(f"Removed directory: {filename}")

        if filename == 'ZetaForge.app' or filename == 'zetaforge.app':
            _, server_path = get_launch_paths(version, version)
            if os.path.exists(server_path):
                print(f"Found existing version {version}")
            else:
                # did not find the correct version, reinstall it
                print(f"Found ZetaForge.app but did not find version {version}, removing previous app")
                shutil.rmtree(os.path.join(EXECUTABLES_PATH, filename))

def remove_running_services():
    print(f"Checking for existing kube services to remove..")
    registry = check_kube_svc("registry")
    argo = check_kube_svc("argo-server", "argo")
    if registry:
        build = subprocess.run(["kubectl", "delete", "-f", BUILD_YAML], capture_output=True, text=True)
        print("Removing build: ", {build.stdout})

    if argo:
        build = subprocess.run(["kubectl", "delete", "-f", INSTALL_YAML], capture_output=True, text=True)
        print("Removing build: ", {build.stdout})

def check_version(server_version, client_version):
    try:
        check_and_clean_files(EXECUTABLES_PATH, client_version)
        check_and_clean_files(EXECUTABLES_PATH, server_version)
    except Exception as e:
        print("Error removing previous version: ", e)

def get_app_dir(client_version):
    if platform.system() == 'Darwin':
        app_dir = os.path.join(EXECUTABLES_PATH, "ZetaForge.app")
    elif platform.system() == 'Windows':
        app_dir = os.path.join(EXECUTABLES_PATH, f"ZetaForge-{client_version}-windows-x64")
    else:
        app_dir = os.path.join(EXECUTABLES_PATH, f"ZetaForge-{client_version}-linux-arm64")
        if platform.machine() == 'x86_64' or platform.machine() == 'x86-64':
            app_dir = os.path.join(EXECUTABLES_PATH, f"ZetaForge-{client_version}-linux-x64")

    return app_dir

def get_launch_paths(server_version, client_version):
    server_name = get_server_executable(server_version) #need to change the function name
    app_dir = get_app_dir(client_version)

    if platform.system() == 'Darwin':
        client_path = os.path.join(app_dir, "Contents", "MacOS", "ZetaForge")
        server_dir = os.path.join(app_dir, "Contents" ,"Resources", "server2")
    elif platform.system() == 'Windows':
        client_path = os.path.join(app_dir, "ZetaForge.exe")
        server_dir = os.path.join(app_dir, "resources", "server2")
    else:
        client_path = os.path.join(app_dir, "zetaforge")
        server_dir = os.path.join(app_dir, "resources", "server2")

    return client_path, os.path.join(server_dir, server_name)


def download_binary(bucket_key, destination):
    bucket = "forge-executables-test"
    print(f"Fetching executable: {bucket_key}")
    try:
        meta_data = s3.head_object(Bucket=bucket, Key=bucket_key)
    except Exception as e:
        raise Exception(f"Executable not found: {bucket_key}! There is no binary build for this version and platform, please log an issue at https://github.com/zetane/zetaforge")

    total_length = int(meta_data.get('ContentLength', 0) / (1024 * 1024))
    downloaded = 0
    def progress(chunk):
        nonlocal downloaded
        downloaded += chunk
        download_mb = int(downloaded / (1024*1024))
        done = int((50 * downloaded / total_length) / (1024 * 1024))

        sys.stdout.write("\r[%s%s] %s/%sMB" % ('=' * done, ' ' * (50-done), download_mb, total_length) )
        sys.stdout.flush()

    print(f"Downloading app {bucket_key} to {EXECUTABLES_PATH}")
    s3.download_file(bucket, bucket_key, destination, Callback=progress)
    print("\nCompleted app download..")


def install_frontend_dependencies(client_version, no_cache=True):
    os.makedirs(EXECUTABLES_PATH, exist_ok=True)

    bucket_key = get_download_file(client_version)
    app_dir = get_app_dir(client_version)
    tar_file = os.path.join(EXECUTABLES_PATH, bucket_key)
    if not os.path.exists(tar_file) or no_cache:
        download_binary(bucket_key, tar_file)

    print("Unzipping and installing app..")

    if os.path.exists(app_dir):
        shutil.rmtree(app_dir)

    extract_tar(tar_file, EXECUTABLES_PATH)

    print(f"Zetaforge extracted and installed at {os.path.join(EXECUTABLES_PATH)}")

    return True
