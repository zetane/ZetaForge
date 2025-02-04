import os
import inspect
import json
import sys
import shutil
from computations import compute

def main():
    # Get block ID
    block_id = sys.argv[1]

    params = []
    debug_inputs = {}

    # Collect arguments passed to the script
    args_dict = {}
    for arg in sys.argv[3:]:
        key, value = arg.split('=')
        if value.isdigit():
            args_dict[key] = int(value)
        else:
            try:
                args_dict[key] = float(value)
            except ValueError:
                args_dict[key] = str(value)  # Leave as string if conversion fails

    args_dict_copy = args_dict.copy()

    if(sys.argv[2] == "docker"):
        for key, value in args_dict_copy.items():
            if "\\" in str(value):  # Check if value is an absolute path
                args_dict_copy[key] = value.split("\\")[-1]  # Extract the last part of the path (the file name)

    # Fetch outputs from pipeline.json and get the corresponding parameters
    for key in inspect.signature(compute).parameters.keys():
        value = args_dict_copy.get(key)
        debug_inputs[key] = value

        if value is not None:
            params.append(value)
        else:
            print(f"Warning: No value found for {key} in pipeline.json or in argument")

    # Call the compute function
    outputs = compute(*params)

    for key, value in outputs.items():
        output_file_path = os.path.join(f"{block_id}{key}.txt")

        with open(output_file_path, "w") as file:
            file.write(json.dumps({key: value}))

if __name__ == "__main__":
    main()
