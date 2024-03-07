import os
import ast
import inspect
from computations import compute

def main():
    params_string = []
    params = []
    for key in inspect.signature(compute).parameters.keys():
        params_string.append(os.getenv(key))

    print("Input params: ", params_string)
    for i in range(len(params_string)):
        print(i, params_string[i])
        params.append(ast.literal_eval(params_string[i]))

    outputs = compute(*params)
    print("Outputs: ", outputs)
    for key, value in outputs.items():
        with open(key + ".txt", "w") as file:
            file.write(str(value))

if __name__ == "__main__":
    main()
