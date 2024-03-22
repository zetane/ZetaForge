import os
import ast
import inspect
import shutil
import json
from computations import compute

def main():
    # 1. Make a list of all the files in the current execution directory and store it
    initial_files_and_folders = set(os.listdir())

    # 2. Check for all the files in the /files directory
    files_dir = "/files"
    if os.path.exists(files_dir):
        # 3. Copy any files and folders (recursively) in /files into the current execution directory
        for item in os.listdir(files_dir):
            src_path = os.path.join(files_dir, item)
            dst_path = os.path.join(os.getcwd(), item)
            if os.path.isdir(src_path):
                shutil.copytree(src_path, dst_path, dirs_exist_ok=True)
            else:
                shutil.copy2(src_path, dst_path)

    params = list()
    inputs = dict()
    debug_inputs = dict()

    for key in inspect.signature(compute).parameters.keys():
        value = os.getenv(key)
        debug_inputs[key] = value
    
    print("debug|||", debug_inputs)

    for key in inspect.signature(compute).parameters.keys():
        value = os.getenv(key)
        debug_inputs[key] = value
        params.append(ast.literal_eval(value))
        inputs[key] = value
    
    json_inputs = json.dumps(inputs)
    print("inputs|||", json_inputs)

    outputs = compute(*params)

    # the "|||" are used for parsing
    json_outputs = json.dumps(outputs)
    print("outputs|||", json_outputs)

    for key, value in outputs.items():
        with open(key + ".txt", "w") as file:
            file.write(json.dumps(value))

    # 4. Check the current execution directory for files and folders after the compute function executes
    current_files_and_folders = set(os.listdir())
    print("Current dir: ", current_files_and_folders)

    # 5. Diff the new exec dir files and folders from the 1st exec dir files and folders state
    new_items = current_files_and_folders - initial_files_and_folders

    # 6. Copy any new files in the current execution directory to /files
    if os.path.exists(files_dir):
        for item in new_items:
            src_path = os.path.join(os.getcwd(), item)
            dst_path = os.path.join(files_dir, item)
            if os.path.isdir(src_path):
                shutil.copytree(src_path, dst_path, dirs_exist_ok=True)
            else:
                shutil.copy2(src_path, dst_path)


if __name__ == "__main__":
    main()
