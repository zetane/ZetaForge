import re
from collections import OrderedDict
import sys
import os
import argparse
import shutil
import json


def dynamic_import(folder, module_name, function_name):
    sys.path.insert(0, folder)
    module = __import__(module_name, fromlist=[function_name])
    function = getattr(module, function_name)
    return function


def parse_docstring(docstring):
    """
    Parses the docstring and extracts inputs and outputs with their types.

    Args:
        docstring (str): The docstring to parse.

    Returns:
        dict: A dictionary containing inputs and outputs with their types.
    """
    inputs_outputs = OrderedDict(
        [('inputs', OrderedDict()), ('outputs', OrderedDict())])

    sections = re.split(r'\n\s*\n', docstring)
    for section in sections:
        if section.strip().startswith('Inputs:'):
            for match in re.finditer(r'(\w+)\s*\(([^)]+)\):\s*(.*?)(?:\n|$)', section):
                name = match.group(1)
                type_str = match.group(2)
                description = match.group(3).strip()
                inputs_outputs['inputs'][name] = {
                    'type': type_str, 'description': description, "connections": [], "connections": []}
        elif section.strip().startswith('Outputs:'):
            for match in re.finditer(r'(\w+)\s*\(([^)]+)\):\s*(.*?)(?:\n|$)', section):
                name = match.group(1)
                type_str = match.group(2)
                description = match.group(3).strip()
                inputs_outputs['outputs'][name] = {
                    'type': type_str, 'description': description, "connections": [], "connections": []}

    return inputs_outputs


def extract_description(docstring):
    """
    Extracts the description from the docstring.

    Args:
        docstring (str): The docstring to parse.

    Returns:
        str: The description contained in the docstring.
    """
    # Find the index of 'Inputs:'
    input_index = docstring.find('Inputs:')

    if input_index == -1:
        return ""  # 'Inputs:' not found, return empty string

    # Everything before 'Inputs:' is considered as the description
    description = docstring[:input_index].strip()

    return description


target_directory = os.path.dirname(os.path.realpath(__file__))
print('Target', target_directory)

parser = argparse.ArgumentParser(description="Block name")
parser.add_argument('--block_name', type=str, help='Name of the block')
parser.add_argument('--block_user_name', type=str, help='User named block')

args = parser.parse_args()
print("The folder name from the frontend is: ", args.block_name)

my_blocks = os.path.join(os.path.abspath(os.path.join(target_directory, '..', '..')), 'my_blocks')
new_dir = os.path.join(my_blocks, args.block_name)
os.makedirs(new_dir)

print(f"New directory created: {new_dir}")

new_block_id = f'{args.block_name}'
print('new', new_block_id)

shutil.copy(os.path.join(target_directory, 'block_base', 'Dockerfile'), new_dir)
shutil.copy(os.path.join(target_directory, 'block_base', 'requirements.txt'), new_dir)
shutil.copy(os.path.join(target_directory, 'block_base', 'specs.json'), new_dir)
os.path.join(os.path.abspath(os.path.join(target_directory, '..', '..')), 'my_blocks')
shutil.copy(os.path.join(my_blocks, 'temp_computations.py'), os.path.join(new_dir, 'computations.py'))

my_folder = new_dir

module_name = "computations"
function_name = "compute"
compute = dynamic_import(my_folder, module_name, function_name)

# Extract docstring from the function
docstring = compute.__doc__
print(docstring)

# Parse the docstring
parsed_docstring = parse_docstring(docstring)
print('Description', extract_description(docstring))

with open(os.path.join(my_folder, 'specs.json'), 'r') as f:
    specs = json.load(f)

specs["block"].update(parsed_docstring)
specs["block"]['information']['id'] = new_block_id
specs["block"]['information']['name'] = args.block_name
specs["block"]['information']['name'] = args.block_user_name
specs["block"]['information']['description'] = extract_description(docstring)
specs["block"]['action']['container_uuid'] = new_block_id
specs["block"]['action']['container_image_uuid'] = new_block_id
specs["block"]['action']['block_source'] = 'my_blocks/'+ args.block_name
specs["block"]['action']['version'] = 'latest'

with open(os.path.join(my_folder, 'specs.json'), 'w') as f:
    json.dump(specs, f)

# Serialize the dictionary into a JSON string
json_string = json.dumps(specs, indent=4)
print(json_string)

# THIS IS TO GENERATE THE PIP REQUIREMENTS
# import subprocess
# result = subprocess.run(['pipreqs', my_folder], stdout=subprocess.PIPE, text=True)
# print(result.stdout)
