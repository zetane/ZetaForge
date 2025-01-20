import requests
import platform
import subprocess
import gzip
import boto3
import hashlib
import os
import shutil
from pathlib import Path
from botocore.client import Config
from botocore import UNSIGNED
import ssl
import sys
from zipfile import ZipFile
import tarfile
from .check_forge_dependencies import check_kube_svc
from pkg_resources import resource_filename
from .logger import CliLogger

import json
from typing import Optional, Tuple, Dict

# BACKEND = resource_filename("")
EXECUTABLES_PATH = os.path.join(Path(__file__).parent, 'executables')
ssl._create_default_https_context = ssl._create_unverified_context

BUILD_YAML = resource_filename("zetaforge", os.path.join('utils', 'build.yaml'))
INSTALL_YAML = resource_filename("zetaforge", os.path.join('utils', 'install.yaml'))

s3 = boto3.client('s3', config=Config(signature_version=UNSIGNED), region_name='us-east-2')
logger = CliLogger()

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
        tar.extractall(target_dir)

    logger.success(f"Extraction complete")

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

def get_etag(bucket: str, key: str) -> Optional[str]:
    """
    Get ETag from S3 object metadata.

    Args:
        bucket: S3 bucket name
        key: Object key

    Returns:
        Optional[str]: ETag if available, None if not found
    """
    try:
        meta_data = s3.head_object(Bucket=bucket, Key=key)
        etag = meta_data.get('ETag', '').strip('"')  # Remove surrounding quotes
        return etag
    except Exception as e:
        logger.error(f"Failed to get ETag: {e}")
        return None

def verify_etag(file_path: str, expected_etag: str) -> bool:
    """
    Verify if local file matches S3 ETag.
    For multipart uploads, we just check if the file exists
    as the ETag calculation for multipart uploads is complex.

    Args:
        file_path: Path to local file
        expected_etag: Expected ETag from S3

    Returns:
        bool: True if file exists and matches simple ETag
    """
    if not os.path.exists(file_path):
        return False

    # If it's a multipart ETag (contains a dash), we just verify file exists
    if '-' in expected_etag:
        return True

    # For simple ETags (no multipart), we can do a direct MD5 comparison
    import hashlib
    md5_hash = hashlib.md5()

    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            md5_hash.update(chunk)

    calculated_etag = md5_hash.hexdigest()
    return calculated_etag == expected_etag

def download_with_verification(bucket_key: str, destination: str, bucket: str = "forge-executables-test") -> bool:
    """
    Download file if needed and verify integrity.

    Args:
        bucket_key: Key in S3 bucket
        destination: Local destination path
        bucket: S3 bucket name

    Returns:
        bool: True if file is available and verified
    """
    try:
        # Get expected hash from S3 metadata
        print(f"Fetching {bucket_key} from {bucket}")
        expected_etag = get_etag(bucket, bucket_key)
        if not expected_etag:
            logger.error("Could not get ETag for verification")
            return False

        if os.path.exists(destination):
            if verify_etag(destination, expected_etag):
                logger.success(f"Using cached version: {os.path.basename(destination)}")
                return True
            else:
                logger.warning("Cache invalid or outdated, downloading fresh copy")
                os.remove(destination)

        # Get file size for progress bar
        meta_data = s3.head_object(Bucket=bucket, Key=bucket_key)
        total_length = int(meta_data.get('ContentLength', 0))

        # Download with progress bar
        with logger.create_download_progress() as progress:
            task_id = progress.add_task(
                description=f"Downloading {os.path.basename(bucket_key)}",
                total=total_length
            )

            def progress_callback(chunk):
                progress.update(task_id, advance=chunk)

            s3.download_file(
                bucket,
                bucket_key,
                destination,
                Callback=progress_callback
            )

        # Verify downloaded file
        if verify_etag(destination, expected_etag):
            logger.success("Download verified successfully")
            return True
        else:
            logger.error("Download verification failed")
            os.remove(destination)
            return False

    except Exception as e:
        print(f"Error during download: {e}")
        if os.path.exists(destination):
            os.remove(destination)
        return False


class VersionInstallError(Exception):
    """Custom exception for installation errors"""
    pass

def load_config(config_file: str) -> Optional[Dict]:
    """
    Load and validate configuration file.

    Args:
        config_file: Path to config file

    Returns:
        Optional[Dict]: Configuration dictionary or None if invalid/missing
    """
    if os.path.exists(config_file):
        try:
            with open(config_file, "r") as file:
                config = json.load(file)
                return config
        except (IOError, json.JSONDecodeError) as e:
            print(f"Error loading configuration file: {e}")
    return None

def get_config_path(app_dir: str) -> str:
    """Get the platform-specific path to config.json"""
    if platform.system() == 'Darwin':
        return os.path.join(app_dir, "Contents", "Resources", "config.json")
    else:
        return os.path.join(app_dir, "resources", "config.json")

def backup_config(old_dir: str, new_dir: str) -> bool:
    """
    Backup config.json from old installation to new installation and validate it.

    Args:
        old_dir: Path to old installation
        new_dir: Path to new installation

    Returns:
        bool: True if config was copied and validated successfully
    """
    old_config_path = get_config_path(old_dir)
    new_config_path = get_config_path(new_dir)

    # First check if old config exists and is valid
    old_config = load_config(old_config_path)
    if old_config is None:
        print("No valid configuration found in previous installation")
        return False

    try:
        # Ensure target directory exists
        os.makedirs(os.path.dirname(new_config_path), exist_ok=True)

        # Copy the config file
        shutil.copy2(old_config_path, new_config_path)
        print("Preserved existing configuration")

        # Validate the copied config
        new_config = load_config(new_config_path)
        if new_config is None:
            print("Warning: Config validation failed after copy")
            return False

        return True
    except IOError as e:
        print(f"Warning: Failed to copy config file: {e}")
        return False

def verify_installation(client_path: str, server_path: str) -> bool:
    """
    Verify that the new installation is valid and has required components.

    Args:
        client_path: Path to client executable
        server_path: Path to server executable

    Returns:
        bool: True if installation is valid
    """
    if not (os.path.exists(client_path) and os.path.exists(server_path)):
        return False

    return True

def safe_remove(path: str) -> None:
    """Safely remove a file or directory"""
    try:
        if os.path.isfile(path):
            os.remove(path)
            logger.success(f"Removed file: {os.path.basename(path)}")
        elif os.path.isdir(path):
            shutil.rmtree(path)
            logger.success(f"Removed directory: {os.path.basename(path)}")
    except OSError as e:
        logger.warning(f"Warning: Failed to remove {path}: {e}")

def check_version_exists(directory: str, version: str) -> bool:
    """
    Check if a specific version is properly installed.

    Args:
        directory: Installation directory
        version: Version to check for

    Returns:
        bool: True if version exists and is valid
    """
    client_path, server_path = get_launch_paths(version, version)
    return verify_installation(client_path, server_path)

def clean_old_versions(directory: str, current_version: str):
    """
    Remove old versions after confirming new version is installed.
    Preserves downloads (.tar.gz) and the current version.

    Args:
        directory: Installation directory
        current_version: Version to preserve
    """
    for filename in os.listdir(directory):
        if filename.endswith('.tar.gz'):
            continue  # Preserve downloads

        file_path = os.path.join(directory, filename)
        if not os.path.isdir(file_path):
            continue

        # Check if this is a version directory
        file_parts = filename.split('-')
        if len(file_parts) >= 2:
            file_version = file_parts[1]
            if file_version != current_version:
                logger.info(f"Removing old version: {filename}")
                safe_remove(file_path)

def install_new_version(version: str, directory: str) -> bool:
    """
    Coordinated installation of new version with config management.

    Args:
        version: Version to install
        directory: Installation directory

    Returns:
        bool: True if installation successful
    """
    try:
        # Step 1: Find existing installations
        if check_version_exists(directory, version):
            logger.success(f"Version {version} is already installed")
            return True

        # Step 2: Download and install new version if needed
        logger.info(f"Installing ZetaForge v{version}", "🔧")
        bucket_key = get_download_file(version)
        tar_file = os.path.join(directory, bucket_key)

        # Download and verify (or use cached copy)
        if not download_with_verification(bucket_key, tar_file):
            raise VersionInstallError(f"Failed to get verified copy of version {version}")

        # Extract and install
        app_dir = get_app_dir(version)
        if os.path.exists(app_dir):
            shutil.rmtree(app_dir)
        logger.info("Extracting files...", "📦")
        extract_tar(tar_file, directory)

        # Verify the new installation works
        if not check_version_exists(directory, version):
            raise VersionInstallError("Installation verification failed")

        # Only clean up old versions after successful installation
        clean_old_versions(directory, version)
        logger.success(f"ZetaForge v{version} installed successfully")

        return True

    except Exception as e:
        print(f"Error during installation: {e}")
        # Clean up partial new installation
        try:
            app_dir = get_app_dir(version)
            if os.path.exists(app_dir):
                safe_remove(app_dir)
        except Exception as cleanup_error:
            print(f"Error during cleanup: {cleanup_error}")
        return False
