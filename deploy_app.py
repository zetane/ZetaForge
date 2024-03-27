"""
THIS IS A SCRIPT THAT EASES UP DEPLOYMENT PROCESS.
IT BASICALLY, HAS THREE STEPS
1) BUILD SERVER2
2) WRAP IT WITHIN FRONTEND
3) BUILD FRONTEND(WHICH ALSO HAS SERVER2)
4) ZIP IT AND UPLOAD IT TO S3


THIS SCRIPT IS NOT DESIGNED FOR USERS, ONLY FOR DEVELOPERS
"""

import subprocess
import shutil
import os
import platform
import json


def main():
    package_json = os.path.join("frontend", "package.json")
    version = 'v1.0.0'
   
    compile_s2(version)
    res = subprocess.Popen(['npm','install'], cwd="frontend", stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    res.communicate()
    res = subprocess.Popen(['npm', 'run', 'build'], cwd="frontend", stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    res.communicate()
def compile_s2(version):
    s = subprocess.run("go build", shell=True)
    path = os.path.join("frontend", "server2")
    server = "server"
    if os.path.exists(path):
        shutil.rmtree(path)
    os.makedirs(path)
    filename = 's2-' + version
    os_ = platform.system()
    machine = platform.machine()
    if os_ == "Windows":
        filename += '.exe'
        server += ".exe"
    else:
        if machine == 'x86_64' or machine == 'x86-64':
            filename += '-amd64'
        else:
            filename += '-arm64'
    
    os.rename(server, os.path.join("frontend", "server2", filename))

    shutil.copyfile("entrypoint.py", os.path.join("frontend", "server2", "entrypoint.py"))






if __name__ == '__main__':
    main()
