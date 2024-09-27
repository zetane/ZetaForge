import os
import inspect
import json
import sys
import shutil
# from computations import compute

def main():
    # Get the directory of the script (block folder)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
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
        # print(f">>>Copied {item} from 'history' to {script_dir}")

    # Get block ID from the compute directory
    block_id = compute_dir

    params = []
    debug_inputs = {}

    # Collect arguments passed to the script
    args_dict = {}
    for arg in sys.argv[3:]:
        key, value = arg.split('=')
        # Try to convert value to int or float, if applicable
        if value.isdigit():
            args_dict[key] = int(value)
        else:
            try:
                args_dict[key] = float(value)
            except ValueError:
                args_dict[key] = value  # Leave as string if conversion fails

    # Ensure images parameter is a Python list (if it's passed as a string)
    if 'images' in args_dict and isinstance(args_dict['images'], str):
        # Convert string to a Python list
        args_dict['images'] = json.loads(args_dict['images'])

    # Fetch outputs from pipeline.json and get the corresponding parameters
    for key in inspect.signature(compute).parameters.keys():
        value = args_dict.get(key)
        debug_inputs[key] = value

        if value is not None:
            params.append(value)  # Append the value directly
        else:
            print(f"Warning: No value found for {key} in pipeline.json")

    # print("debug|||", debug_inputs)

    # Call the compute function
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
                os.remove(dst_path)  # Remove the existing file if it exists
            elif os.path.isdir(dst_path):
                shutil.rmtree(dst_path)  # Remove the directory if it exists
        
        shutil.move(src_path, dst_path)  # Move new files to the history subfolder
        

    # Output results to files in the 'history' folder
    for key, value in outputs.items():
        result = block_id.rsplit('-', 1)[0].split('\\')[-1]
        if ("background-removal" in block_id):
            output_file_path = os.path.join(history_subfolder, f"{result}-output_path.txt")
        elif ("openai-agent" in block_id):
            output_file_path = os.path.join(history_subfolder, f"{result}-response.txt")
        else:
            output_file_path = os.path.join(history_subfolder, f"{result}-image_paths.txt")
    
        with open(output_file_path, "w") as file:
            file.write(json.dumps(value))

    # Optionally log outputs
    json_outputs = json.dumps(outputs)
    print(">> outputs: ", json_outputs)

if __name__ == "__main__":
    main()
