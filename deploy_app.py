"""
THIS IS A SCRIPT THAT EASES UP DEPLOYMENT PROCESS.
IT BASICALLY, HAS THREE STEPS
1) BUILD SERVER2
2) WRAP IT WITHIN FRONTEND
3) BUILD FRONTEND(WHICH ALSO HAS SERVER2)


THIS SCRIPT IS NOT DESIGNED FOR USERS, ONLY FOR DEVELOPERS
"""

import subprocess
import shutil
import os
import threading
import json
import argparse


def get_package_version():
    # Specify the path to the package.json file
    package_json_path = os.path.join(os.path.dirname(__file__), 'frontend', 'package.json')
    
    try:
        # Read the contents of package.json
        with open(package_json_path, 'r') as file:
            package_data = json.load(file)
        
        # Extract the version from the package data
        version = package_data.get('version')
        
        if version:
            return version
        else:
            raise ValueError("Version not found in package.json")
    
    except FileNotFoundError:
        raise FileNotFoundError("package.json not found")
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON format in package.json")


def main():
    parser = argparse.ArgumentParser(description="Description of your script")
    parser.add_argument("--arch", nargs="+", default=['amd64', 'arm64'], help="Specify architecture (options: arm64, amd64)")
    parser.add_argument("--platform", nargs="+", default=['darwin', 'linux', 'windows'], help="Specify platform.  If not specified, it builts for every platform (options: darwin, linux, windows)")
    args = parser.parse_args()
    
    
    os_list = args.platform
    version = get_package_version()
    frontend = os.path.join("frontend", "server2")
    os.makedirs(frontend, exist_ok=True)
    res = subprocess.run('npm install', cwd="frontend", stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)

    for os_ in os_list:
        print(f"Compiling {version} for {os_}..")
        compile_app(version, os_, args.arch)
    
    
def compile_app(version, goos, archs = ['amd64', 'arm64']):
    for goarch in archs:
        print(f"Compiling {goarch}..")
        if goarch == 'arm64' and goos == 'windows':
            continue

        frontend = os.path.join("frontend", "server2")
        shutil.rmtree(frontend)
        os.makedirs(frontend, exist_ok=True)

        try:
            arch = goarch
            if goos == 'windows':
                arch = 'amd64'
                s = subprocess.run(["env", f"GOOS={goos}", f"GOARCH={arch}", "CGO_ENABLED=1", "CC=x86_64-w64-mingw32-gcc", "go", "build"], capture_output=True, text=True)
                if s.returncode != 0:
                    raise Exception(f"Failed to build go server: {s.stderr}")
                print(s)
            else:
                s = subprocess.run(["env", f"GOOS={goos}", f"GOARCH={arch}", "go", "build"], capture_output=True, text=True)
                if s.returncode != 0:
                    raise Exception(f"Failed to build go server: {s.stderr}")
                print(s)
        except Exception as err:
            print("ERROR WHILE BUILDING GO")
            print(err)
            raise Exception("Error")

        server = "server"
        filename = 's2-' + version
        if goos == "windows":
            filename += '.exe'
            server += ".exe"
        else:
            filename += f'-{goarch}'
        
        dest = os.path.join(frontend, filename)
        print(f"Compiled go server {server}, moving to {dest}")
        os.rename(server, dest)

        print("Copying entrypoint.py..")
        shutil.copyfile("entrypoint.py", os.path.join("frontend", "server2", "entrypoint.py"))
        print(f'Building client: {goos}-{goarch}')
        if goos == 'windows':
            res = subprocess.Popen(["npm" , "run", f"build:{goos}"], cwd="frontend", stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        else:
            res = subprocess.Popen(["npm" , "run", f"build:{goos}-{goarch}"], cwd="frontend", stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        def read_output(process, name):
            for line in process.stdout:
                print(f"{name}: {line.decode('utf-8')}", end='')

        def read_error(process, name):
            for line in process.stderr:
                print(f"{name} (stderr): {line.decode('utf-8')}", end='')

        # Create threads to read the outputs concurrently
        npm_stdout_thread = threading.Thread(target=read_output, args=(res, '[npm build]'))
        npm_stderr_thread = threading.Thread(target=read_error, args=(res, '[npm build]'))

        npm_stdout_thread.start()
        npm_stderr_thread.start()

        npm_stdout_thread.join()
        npm_stderr_thread.join()
        

if __name__ == '__main__':
    main()
