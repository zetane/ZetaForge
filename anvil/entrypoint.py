import os, sys
import ast
import inspect
import shutil
import json
from typing import Dict, Any, get_args, get_origin, Union
from datetime import datetime
from computations import compute

def convert_to_type(value: str, target_type: Any) -> Any:
    """Convert string value to target type, handling complex type hints."""
    if value is None:
        return None

    # Handle None/null values
    if value.lower() in ('none', 'null'):
        return None

    # Get the base type and any generic parameters
    origin = get_origin(target_type)
    args = get_args(target_type)

    # Handle Optional types (Union[type, None])
    if origin is Union:
        types = [t for t in args if t is not type(None)]
        if len(types) == 1:
            try:
                return convert_to_type(value, types[0])
            except (ValueError, TypeError):
                return None

    # Handle basic types
    if origin is None:
        if target_type == bool:
            return value.lower() == 'true'
        if target_type == datetime:
            for fmt in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"]:
                try:
                    return datetime.strptime(value, fmt)
                except ValueError:
                    continue
            raise ValueError(f"Could not parse datetime: {value}")
        if target_type in (int, float, str):
            return target_type(value)

    # Handle lists
    if origin in (list, tuple):
        try:
            parsed = ast.literal_eval(value)
            if not isinstance(parsed, (list, tuple)):
                raise ValueError("Value is not a list or tuple")
            if args:
                return [convert_to_type(str(item), args[0]) for item in parsed]
            return list(parsed)
        except (ValueError, SyntaxError) as e:
            raise ValueError(f"Invalid list format: {e}")

    # Handle dictionaries
    if origin is dict:
        try:
            parsed = ast.literal_eval(value)
            if not isinstance(parsed, dict):
                raise ValueError("Value is not a dictionary")
            if len(args) == 2:
                return {
                    convert_to_type(str(k), args[0]): convert_to_type(str(v), args[1])
                    for k, v in parsed.items()
                }
            return parsed
        except (ValueError, SyntaxError) as e:
            raise ValueError(f"Invalid dict format: {e}")

    # If no specific type conversion, try literal_eval
    try:
        return ast.literal_eval(value)
    except (ValueError, SyntaxError):
        return value

def datetime_converter(o):
    """Convert datetime objects to string."""
    if isinstance(o, datetime):
        return o.__str__()

def main():
    original_path = os.getcwd()

    # Handle input files
    files_dir = os.path.join("/files")
    if not os.path.exists(files_dir):
        os.makedirs(files_dir, exist_ok=True)
    if os.path.exists(files_dir):
        for item in os.listdir(files_dir):
            src_path = os.path.join(files_dir, item)
            dst_path = os.path.join(os.getcwd(), item)
            shutil.move(src_path, dst_path)

    # Track initial files state
    initial_files_and_folders = set(os.listdir())

    # Setup phase - parse inputs with type checking
    try:
        block_id = os.getenv("_blockid_")
        if not block_id:
            raise ValueError("_blockid_ environment variable not set")

        # Get function signature for type hints
        sig = inspect.signature(compute)

        params = []
        inputs = {}
        debug_inputs = {}

        # Process each parameter with type hints
        for param_name, param in sig.parameters.items():
            value = os.getenv(param_name)
            debug_inputs[param_name] = value

            if value is not None:
                # Use type hint if available, otherwise fall back to literal_eval
                if param.annotation != inspect.Parameter.empty:
                    try:
                        converted_value = convert_to_type(value, param.annotation)
                        params.append(converted_value)
                        inputs[param_name] = value
                    except (ValueError, TypeError) as e:
                        print(f"Warning: Failed to convert '{param_name}' using type hint: {e}",
                              file=sys.stderr)
                        # Fall back to literal_eval
                        converted_value = ast.literal_eval(value)
                        params.append(converted_value)
                        inputs[param_name] = value
                else:
                    # No type hint, use literal_eval
                    converted_value = ast.literal_eval(value)
                    params.append(converted_value)
                    inputs[param_name] = value
            else:
                params.append(None)
                inputs[param_name] = None

        # Print debug information using ||| separator
        print("debug|||", debug_inputs)
        print("inputs|||", json.dumps(inputs))

    except Exception as e:
        print(f"Error in setup: {str(e)}", file=sys.stderr)
        sys.exit(1)

    # Execution phase - let errors propagate
    outputs = compute(*params)

    # Output phase
    try:
        # Print outputs using ||| separator
        json_outputs = json.dumps(outputs, default=datetime_converter)
        print("outputs|||", json_outputs)

        # Change back to original path
        os.chdir(original_path)

        # Write individual output files
        for key, value in outputs.items():
            with open(f"{block_id}-{key}.txt", "w") as file:
                file.write(json.dumps(value, default=datetime_converter))

        # Handle output files
        current_files_and_folders = set(os.listdir())
        new_items = current_files_and_folders - initial_files_and_folders

        if os.path.exists(files_dir):
            for item in new_items:
                src_path = os.path.join(os.getcwd(), item)
                dst_path = os.path.join(files_dir, item)
                if os.path.isdir(src_path):
                    shutil.copytree(src_path, dst_path, dirs_exist_ok=True)
                else:
                    shutil.copy2(src_path, dst_path)

    except Exception as e:
        print(f"Error in output handling: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
