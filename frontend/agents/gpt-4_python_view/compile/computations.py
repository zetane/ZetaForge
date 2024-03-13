import argparse
import json
import os
import re
import shutil
import sys
from collections import OrderedDict


def extract_docstring_from_file(file_path, function_name):
    with open(file_path, "r") as file:
        content = file.read()
        # Pattern to match triple double quotes or triple single quotes
        pattern = rf"def {function_name}\(.*?\):\s*(\"\"\"(.*?)\"\"\"|'''(.*?)''')"
        match = re.search(pattern, content, re.DOTALL)
        if match:
            # Docstring could be in either the second or third group, depending on quote type
            return match.group(2) or match.group(3)
        return None


def parse_docstring(docstring):
    """
    Parses the docstring and extracts inputs and outputs with their types.

    Args:
        docstring (str): The docstring to parse.

    Returns:
        dict: A dictionary containing inputs and outputs with their types.
    """
    inputs_outputs = OrderedDict(
        [("inputs", OrderedDict()), ("outputs", OrderedDict())]
    )

    sections = re.split(r"\n\s*\n", docstring)
    for section in sections:
        if section.strip().startswith("Inputs:"):
            for match in re.finditer(r"(\w+)\s*\(([^)]+)\):\s*(.*?)(?:\n|$)", section):
                name = match.group(1)
                type_str = match.group(2)
                description = match.group(3).strip()
                inputs_outputs["inputs"][name] = {
                    "type": type_str,
                    "description": description,
                    "connections": [],
                    "connections": [],
                }
        elif section.strip().startswith("Outputs:"):
            for match in re.finditer(r"(\w+)\s*\(([^)]+)\):\s*(.*?)(?:\n|$)", section):
                name = match.group(1)
                type_str = match.group(2)
                description = match.group(3).strip()
                inputs_outputs["outputs"][name] = {
                    "type": type_str,
                    "description": description,
                    "connections": [],
                    "connections": [],
                }

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
    input_index = docstring.find("Inputs:")

    if input_index == -1:
        return ""  # 'Inputs:' not found, return empty string

    # Everything before 'Inputs:' is considered as the description
    description = docstring[:input_index].strip()

    return description


# Function to extract requirements from a docstring
def extract_requirements_from_docstring(docstring, my_folder):
    print("running requirement.txt build")
    if not docstring:
        return "No docstring provided."

    requirements_pattern = r"Requirements:\s*([\s\S]+?)(?:\n\s*\n|\Z)"
    match = re.search(requirements_pattern, docstring)

    if not match:
        return "No requirements section found in the docstring."

    requirements = match.group(1).strip().split("\n")
    requirements = [req.strip() for req in requirements if req.strip()]

    with open(os.path.join(my_folder, "requirements.txt"), "w") as f:
        for req in requirements:
            f.write(req + "\n")

    return "requirements.txt file generated."


target_directory = os.path.dirname(os.path.realpath(__file__))

parser = argparse.ArgumentParser(description="Block name")
parser.add_argument("--block_path", type=str, help="the path of the original block ")
parser.add_argument("--block_name", type=str, help="Name of the block")
parser.add_argument("--block_user_name", type=str, help="User named block")

args = parser.parse_args()

module_name = "computations"
function_name = "compute"

file_path = os.path.join(args.block_path, f"{module_name}.py")
docstring = extract_docstring_from_file(file_path, function_name)
print(docstring)

# Parse the docstring
parsed_docstring = parse_docstring(docstring)
print("Description:", extract_description(docstring))

with open(os.path.join(args.block_path, "specs_v1.json"), "r") as f:
    specs = json.load(f)

specs.update(parsed_docstring)
specs["information"]["id"] = args.block_name
specs["information"]["name"] = args.block_name
specs["information"]["name"] = args.block_user_name
specs["information"]["description"] = extract_description(docstring)
specs["action"]["container_uuid"] = args.block_name
specs["action"]["container_image_uuid"] = args.block_name
specs["action"]["block_source"] = "my_blocks/" + args.block_name
specs["action"]["version"] = "latest"

with open(os.path.join(args.block_path, "specs_v1.json"), "w") as f:
    json.dump(specs, f, indent=2)

extract_requirements_from_docstring(docstring, args.block_path)
