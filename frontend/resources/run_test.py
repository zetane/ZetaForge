import io
import os
import subprocess
import sys

# Change standard output encoding to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def run_command(command, log_file):
    with subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT) as process:
        with open(log_file, "ab") as f:  # Open in binary append mode
            for line in iter(lambda: process.stdout.readline(), b''):
                print(line.decode('utf-8', errors='replace'), end='')  # Decode for printing
                f.write(line)  # Write raw bytes to file

            if process.wait() != 0:
                print(f"Command '{command}' failed with error")


def main(block_dir, block_key):
    container_dir = '/app'  # The directory inside the container where you want to mount
    image_name = container_name = block_key
    
    commands = [
        ["docker", "rm", container_name],
        ["docker", "rmi", image_name],
        ["docker", "build", "-t", image_name, block_dir],
        ["docker", "run", "--name", container_name, "-v", f"{block_dir}:{container_dir}", image_name, "python", "-B", "-c", "from computations import test; test()"],
    ]
    
    log_file = os.path.join(block_dir, 'logs.txt')
    with open(log_file, 'wb'):
        pass

    for command in commands:
        print(f'Executing: {command}')
        run_command(command, log_file)

if __name__ == "__main__":
    block_dir = sys.argv[1]
    block_key = sys.argv[2]
    main(block_dir, block_key)