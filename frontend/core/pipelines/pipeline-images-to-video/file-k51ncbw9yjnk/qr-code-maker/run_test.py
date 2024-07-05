import subprocess
import os
import io
import sys

# Change standard output encoding to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def run_command(command, log_file):
    with subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT) as process:
        with open(log_file, "ab") as f:  # Open in binary append mode
            for line in iter(lambda: process.stdout.readline(), b''):
                print(line.decode('utf-8', errors='replace'), end='')  # Decode for printing
                f.write(line)  # Write raw bytes to file

            if process.wait() != 0:
                print(f"Command '{command}' failed with error")


def main():
    host_dir = os.getcwd()
    container_dir = '/app'  # The directory inside the container where you want to mount

    commands = [
        "docker rm -f test_container",
        "docker rmi test_block_image",
        "docker build -t test_block_image .",
        f"docker run --name test_container -v \"{host_dir}\":\"{container_dir}\" test_block_image python -B -c \"from computations import test; test()\""
    ]
    
    log_file = os.path.join(os.getcwd(), 'logs.txt')
    with open(log_file, 'wb'):
        pass

    for command in commands:
        print(f'Executing: {command}')
        run_command(command, log_file)

if __name__ == "__main__":
    main()