import os
import sys
import inspect
import ast
import json
from typing import Dict, Any, get_args, get_origin, Union
from datetime import datetime

def convert_to_type(value: str, target_type: Any) -> Any:
    """Convert string value to target type, handling complex type hints."""
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
            # Try common datetime formats
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
            # Parse the string as a literal Python expression
            parsed = ast.literal_eval(value)
            if not isinstance(parsed, (list, tuple)):
                raise ValueError("Value is not a list or tuple")
            # Convert each element to the target type if specified
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
            # Convert keys and values if type args are specified
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
        # If literal_eval fails, return the string as-is
        return value

def write_output(block_id: str, key: str, value: Any) -> None:
    """Write output to a JSON file."""
    output_path = f"{block_id}{key}.txt"
    with open(output_path, "w") as f:
        json.dump({key: value}, f)

def parse_cli_args(args: list[str], compute_func) -> Dict[str, Any]:
    """Parse command line arguments using function type hints."""
    # Get function signature
    sig = inspect.signature(compute_func)

    # Parse arguments
    result = {}
    for arg in args:
        try:
            key, value = arg.split('=', 1)

            # Get parameter type hint if available
            param_type = (sig.parameters[key].annotation
                         if key in sig.parameters
                         else inspect.Parameter.empty)

            if param_type != inspect.Parameter.empty:
                # Convert value using type hint
                try:
                    result[key] = convert_to_type(value, param_type)
                    print(f"Converted '{key}' to {param_type}: {result[key]}",
                          file=sys.stdout)
                except (ValueError, TypeError) as e:
                    print(f"Warning: Failed to convert '{key}' to {param_type}: {e}",
                          file=sys.stderr)
                    result[key] = value
            else:
                # No type hint, use literal_eval
                try:
                    result[key] = ast.literal_eval(value)
                    print(f"Evaluated '{key}' as: {result[key]} ({type(result[key])})",
                          file=sys.stdout)
                except (ValueError, SyntaxError):
                    # If literal_eval fails, keep as string
                    result[key] = value
                    print(f"Kept '{key}' as string: {value}", file=sys.stderr)

        except ValueError:
            print(f"Warning: Skipping malformed argument '{arg}'. Expected format: key=value",
                  file=sys.stderr)

    return result

def main():
    if len(sys.argv) < 4:
        print("Usage: entrypoint.py <blockid> <runner> <args...>", file=sys.stderr)
        sys.exit(1)

    # Setup phase - catch our own errors
    try:
        # Get block ID from environment
        block_id = os.environ.get('_blockid_')
        if not block_id:
            raise ValueError("_blockid_ environment variable not set")

        # Import compute function first to get type hints
        from computations import compute

        # Parse command line arguments using function signature
        args_dict = parse_cli_args(sys.argv[3:], compute)

        # Prepare parameters in order
        params = []
        for param_name in inspect.signature(compute).parameters.keys():
            value = args_dict.get(param_name)
            if value is None:
                print(f"No value found for parameter '{param_name}'",
                        file=sys.stderr)
            params.append(value)

    except Exception as e:
        print(f"Error in setup: {str(e)}", file=sys.stderr)
        sys.exit(1)

    # Execution phase - let errors propagate
    outputs = compute(*params)

    # Output phase - catch our own errors
    try:
        for key, value in outputs.items():
            write_output(block_id, key, value)
    except Exception as e:
        print(f"Error writing outputs: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
