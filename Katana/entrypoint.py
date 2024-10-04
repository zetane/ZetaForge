import os
import inspect
import json
import sys
import shutil
import subprocess

def setup_uv_environment(script_dir):
    # Path to the UV environment
    uv_env_path = os.path.join(script_dir, ".venv")
    
    # Create UV environment if it does not exist
    if not os.path.exists(uv_env_path):
        print("Setting up UV environment...")

        try:
            subprocess.run(["uv", "venv", uv_env_path], check=True)
        except subprocess.CalledProcessError as e:
            print(f"Failed to create UV environment: {e}")
            sys.exit(1)

    # Install dependencies from requirements.txt inside the UV environment
    requirements_file = os.path.join(script_dir, "requirements.txt")
    if os.path.exists(requirements_file):
        print("Installing dependencies inside UV environment...")
        try:
            print("HERE>>>")
            subprocess.run(["uv", "pip", "install", "-r", requirements_file], check=True, cwd=script_dir)
        except subprocess.CalledProcessError as e:
            print(f"Failed to install dependencies: {e}")
            sys.exit(1)
    else:
        print("No requirements.txt found. Skipping dependency installation.")

def rerun_with_uv_environment(script_dir):
    # Path to the Python interpreter in the UV environment
    uv_python = os.path.join(script_dir, ".venv", "Scripts", "python.exe")

    # Check if the current Python interpreter is already the one in the UV environment
    if sys.executable == uv_python:
        return  # Continue with the script

    if os.path.exists(uv_python):
        print(f"Re-running the script with the UV environment's Python interpreter: {uv_python}")
        # Re-run the current script with the UV environment's Python interpreter
        subprocess.run([uv_python, __file__] + sys.argv[1:], check=True)
        sys.exit(0)  # Exit the original process
    else:
        print("Could not find the Python interpreter in the UV environment.")
        sys.exit(1)

def main():
    print("ARGUMENTS: " , sys.argv)
    # Get the directory of the script (block folder)
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Set up the UV environment if uv in argument:
    if(sys.argv[3] == "uv"):
        setup_uv_environment(script_dir)
        #Activate the environment:
        rerun_with_uv_environment(script_dir)


    # Get the history subfolder from the arguments
    compute_dir = sys.argv[1]  # Directory with compute logic (block folder)
    history_subfolder = os.path.abspath(sys.argv[2])

    os.chdir(script_dir)

    # Ensure the 'history' subfolder exists
    os.makedirs(history_subfolder, exist_ok=True)

    # Add the block folder (compute_dir) to the Python path to import 'computations'
    sys.path.insert(0, compute_dir)

    # Store the initial list of existing files in the current block folder
    initial_files = set(os.listdir(script_dir))

    # Import 'compute' function after adding the path
    from computations import compute

    # Move all files from the 'history' folder to the current block folder
    for item in os.listdir(history_subfolder):
        src_path = os.path.join(history_subfolder, item)
        dst_path = os.path.join(script_dir, item)
        if os.path.isdir(src_path):
            shutil.copytree(src_path, dst_path, dirs_exist_ok=True)
        else:
            shutil.copy2(src_path, dst_path)

    # Get block ID from the compute directory
    block_id = compute_dir

    params = []
    debug_inputs = {}

    # Collect arguments passed to the script
    args_dict = {}
    for arg in sys.argv[4:]:
        key, value = arg.split('=')
        if value.isdigit():
            args_dict[key] = int(value)
        else:
            try:
                args_dict[key] = float(value)
            except ValueError:
                args_dict[key] = value  # Leave as string if conversion fails

    args_dict_copy = args_dict.copy()

    if(sys.argv[3] == "docker"):
        for key, value in args_dict_copy.items():
            if "\\" in str(value):  # Check if value is an absolute path
                print("CHECKED")
                args_dict_copy[key] = value.split("\\")[-1]  # Extract the last part of the path (the file name)
        print("DICTS: " , args_dict_copy)

    # Ensure images parameter is a Python list (if it's passed as a string)
    if 'images' in args_dict_copy and isinstance(args_dict_copy['images'], str):
        args_dict_copy['images'] = json.loads(args_dict_copy['images'])

    # Fetch outputs from pipeline.json and get the corresponding parameters
    for key in inspect.signature(compute).parameters.keys():
        value = args_dict_copy.get(key)
        debug_inputs[key] = value

        if value is not None:
            params.append(value)
        else:
            print(f"Warning: No value found for {key} in pipeline.json")

    # Call the compute function
    # print(">>>>>>>>>PAssing parameters: " , params)
    outputs = compute(*params)

    # Store the final state of files in the block folder (after compute is executed)
    
    final_files = set(os.listdir(script_dir))

    # Identify new files created during computation (those not in the initial list)
    new_files = final_files - initial_files

    # Move the newly created files back to the 'history' folder
    for new_file in new_files:
        src_path = os.path.join(script_dir, new_file)
        dst_path = os.path.join(history_subfolder, new_file)
        if os.path.exists(dst_path):
            if os.path.isfile(dst_path):
                os.remove(dst_path)
            elif os.path.isdir(dst_path):
                shutil.rmtree(dst_path)
        
        shutil.move(src_path, dst_path)

    # Output results to files in the 'history' folder
    
    for key, value in outputs.items():
        if sys.argv[3] == "docker":
            result = sys.argv[1]
        else:
            result = block_id.rsplit('-', 1)[0].split('\\')[-1]

        if ("background-removal" in block_id):
            output_file_path = os.path.join(history_subfolder, f"{result}-output_path.txt")
        elif ("openai-agent" in block_id):
            output_file_path = os.path.join(history_subfolder, f"{result}-response.txt")
        elif ("images-to-video" in block_id):
            output_file_path = os.path.join(history_subfolder, f"{result}-video_path.txt")
        else:
            output_file_path = os.path.join(history_subfolder, f"{result}-image_paths.txt")

        print("output file path:" , output_file_path)
    
        with open(output_file_path, "w") as file:
            file.write(json.dumps(value))

if __name__ == "__main__":
    main()
