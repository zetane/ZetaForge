import os
import ast
import inspect
from computations import compute

def main():
    params_string = []
    params = []
    for key in inspect.signature(compute).parameters.keys():
        params_string.append(os.getenv(key))
                
    for i in range(len(params_string)):
        params.append(ast.literal_eval(params_string[i]))

    print(params) 
    outputs = compute(*params)
    print(outputs)
    for key, value in outputs.items():
        with open(key + ".txt", "w") as file:
            file.write(str(value))

if __name__ == "__main__":
    main()
