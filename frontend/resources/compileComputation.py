import ast
import json
import sys

def extract_io(source):
    tree = ast.parse(source)
    function_info = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == 'compute':
            # Extract docstring
            docstring = ast.get_docstring(node)
            function_info['description'] = docstring

            # Extract inputs
            inputs = {}
            for arg in node.args.args:
                arg_name = arg.arg
                arg_type = 'Any'  # Default type
                if arg.annotation:
                    # Extract type from annotation if available
                    arg_type = ast.unparse(arg.annotation) if arg.annotation else 'Any'
                inputs[arg_name] = {
                    'type': arg_type,
                    'connections': [],
                    'relays': []
                }
            function_info['inputs'] = inputs

            # Extract outputs
            outputs = {}
            for stmt in node.body:
                if isinstance(stmt, ast.Return):
                    return_value = stmt.value
                    if isinstance(return_value, ast.Dict):
                        for key in return_value.keys:
                            if isinstance(key, ast.Str):
                                output_name = key.s
                                outputs[output_name] = {
                                    'type': 'Any',
                                    'connections': [],
                                    'relays': []
                                }
                    break  # Stop after finding the first return statement

            function_info['outputs'] = outputs
            break

    return function_info


if __name__ == '__main__':
    source = sys.stdin.read()
    io = extract_io(source)
    print(json.dumps(io))