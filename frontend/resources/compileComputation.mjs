import { parser } from "@lezer/python";

async function validateSource(source) {
  // await PythonShell.checkSyntax(source);
  //PYODIDE REQUIRES TO INSTALL DISTRIBUTIONS FOR NODEJS,
  //SO IT MIGHT NOT BE FEASIBLE.
  //BELOW IS THE ENCHANCED VERSION OF THE SYNTAX CHECKER
  try {
    const tree = parser.parse(source);
    const cursor = tree.cursor();

    do {
      if (cursor.type.name === "⚠") {
        throw new Error("Syntax error found at: ", cursor.type.name);
      }
    } while (cursor.next());
  } catch (err) {
    throw new Error("Please check your python syntax: ", err.message);
  }
}

export async function compileComputationFunction(source) {
  const result = await extractIO(source);
  const docstring = getDocstring(source);
  if (docstring) {
    result["description"] = docstring;
  }
  return result;
}

async function extractIO(source) {
  await validateSource(source);
  const tree = parser.parse(source);
  const cursor = tree.cursor();

  const functionInfo = {};
  while (cursor.next()) {
    if (cursor.node.name === "FunctionDefinition") {
      cursor.firstChild();
      cursor.nextSibling();
      const functionName = source.slice(cursor.node.from, cursor.node.to);
      if (functionName === "compute") {
        cursor.nextSibling();
        const inputs = {};
        cursor.firstChild();
        cursor.nextSibling();
        while (cursor.node.name !== ")") {
          const param = source.slice(cursor.node.from, cursor.node.to);
          inputs[param] = {
            type: "Any", // Type inference is complex in Python
            connections: [],
            relays: [],
          };
          cursor.nextSibling();
          if (cursor.node.name === ",") cursor.nextSibling();
        }

        functionInfo["inputs"] = inputs;
        cursor.parent();

        const outputs = {};
        while (cursor.nextSibling()) {
          if (cursor.node.name === "Body") {
            cursor.firstChild();
            while (cursor.nextSibling()) {
              if (cursor.node.name === "ReturnStatement") {
                cursor.firstChild();
                cursor.nextSibling();
                if (cursor.node.name === "DictionaryExpression") {
                  cursor.firstChild();
                  cursor.nextSibling();
                  while (cursor.node.name !== "}") {
                    cursor.nextSibling();
                    if (cursor.node.name === "VariableName") {
                      const outputName = source.slice(
                        cursor.node.from,
                        cursor.node.to,
                      );
                      outputs[outputName] = {
                        type: "Any",
                        connections: [],
                        relays: [],
                      };
                    }
                  }
                }
              }
            }
          }
        }
        functionInfo["outputs"] = outputs;
        break;
      }
    }
  }
  return functionInfo;
}

function getDocstring(source) {
  const tree = parser.parse(source);
  const cursor = tree.cursor();

  const docstrings = {};

  while (cursor.next()) {
    if (cursor.node.name === "FunctionDefinition") {
      cursor.firstChild(); // Move to the 'def' keyword
      cursor.nextSibling(); // Move to the function name

      const functionName = source.slice(cursor.node.from, cursor.node.to);

      if (functionName === "compute") {
        cursor.firstChild();
        while (cursor.node.name !== "Body") {
          cursor.nextSibling();
        }
        cursor.firstChild();
        while (cursor.nextSibling()) {
          if (cursor.node.name === "ExpressionStatement") {
            const docstring = source.slice(
              cursor.node.from + 3,
              cursor.node.to - 3,
            );
            return docstring;
          }
        }
      }

      cursor.nextSibling(); // Move to the parameters
      cursor.nextSibling(); // Move to the colon or the body

      while (cursor.nextSibling()) {
        if (cursor.node.name === "Body") {
          cursor.firstChild(); // Enter the body
          // Check if the first statement is a docstring
          if (cursor.node.name === "ExpressionStatement") {
            cursor.firstChild(); // Move to the string
            if (cursor.node.name === "String") {
              let docstring = source.slice(cursor.node.from, cursor.node.to);
              docstring = docstring.slice(1, -1); // Remove the quotes from the string
              docstrings[functionName] = docstring;
            }
            cursor.parent(); // Move back to the ExpressionStatement
          }
          break;
        }
      }
    }
  }

  return docstrings;
}
