import os
import sys
import re
import json
from dotenv import load_dotenv
import traceback
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

# Load environment variables from .env file
load_dotenv()

# Define system context
openaiSystemContent = """You are an assistant that generates python code and returns it in a way that must follow the template below. 
You absolutely need to give a python code section without abbreviation that follows the template. Do not put code lines at the root, but give only the functions and imports.

By default, when requested to do change or add to the code, modify the latest code section. But when the user ask to do it on another section, do so.

In the template, the function compute contains the code and the function test contains a series of call to compute that runs and prints multiple tests. 

Also give requirements.txt file content in the docstring of the compute function. Don't give the version numbers and if opencv is needed, use opencv-python-headless. If there are no requirements, leave an empty line and do not write sentence like None or No special requirements. none.

Don't insert a __main__ section.

Template:
import ...

def compute(in1, in2, in3,...):
    '''A textual description of the compute function.

    Inputs:
        in1 (all): Textual description of in1
        in2 (all): Textual description of in2
        in3 (all): Textual description of in2
        ... 

    Outputs:
        out1 (all): Textual description of out1
        out2 (all): Textual description of out2
        ...

    Requirements:
        ...
        ...

    '''

#some code
return {{'out1': out1, 'out2': out2, ...}}

def test():
# Call compute multiple times based on a series of inputs. The outputs are then compare with the expected outputs. Print the results and indicate if the tests passed.
"""


def extract_python_code(response):
    """
    Extracts Python code blocks from a given text, excluding standalone compute() or test() calls.
    Assumes that Python code is formatted with triple backticks.
    If no Python code blocks are found, returns the whole response.
    """

    # Pattern to match code blocks fenced by triple backticks
    pattern_backticks = r"```python\n(.*?)```"

    # Extract code blocks fenced by triple backticks
    matches_backticks = re.findall(pattern_backticks, response, re.DOTALL)

    # If no code blocks are found, return the whole response
    if not matches_backticks:
        return response

    # Process each match to remove standalone compute() or test() lines
    processed_code_blocks = []
    for code_block in matches_backticks:
        # Remove standalone compute() or test() lines
        code_block = re.sub(r'^compute\(.*?\)\s*$', '', code_block, flags=re.MULTILINE)
        code_block = re.sub(r'^test\(.*?\)\s*$', '', code_block, flags=re.MULTILINE)
        processed_code_blocks.append(code_block.strip())

    # Combine and return all processed code blocks
    return "\n\n".join(processed_code_blocks)


def compute(user_prompt, model_version, conversation_history):
    # Load the API key from an environment variable
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("No API key found. Please set the OPENAI_API_KEY in .env file.")

    # Use only the last entry from the history
    if conversation_history:
        conversation_history = [conversation_history[-1]]

    # Escape special characters or handle raw strings in conversation history
    escaped_history = []
    for entry in conversation_history:
        # Example of escaping curly braces
        prompt = entry['prompt'].replace("{", "{{").replace("}", "}}")
        response = entry['response'].replace("{", "{{").replace("}", "}}")
        escaped_history.append(("user", prompt))
        escaped_history.append(("assistant", response))

    # Use the escaped history for constructing messages
    messages = [("system", openaiSystemContent)] + escaped_history
    messages.append(("user", "{text}"))

    # Create a ChatPromptTemplate from the messages
    chat_prompt = ChatPromptTemplate.from_messages(messages)

    # Initialize the ChatOpenAI model
    chat_model = ChatOpenAI(openai_api_key=api_key, model=model_version)
    chain = chat_prompt | chat_model

    # Query
    response = chain.invoke({"text": user_prompt})

    # Keep only the python code
    code = extract_python_code(response.content)

    return {'response': code, 'model': model_version}



if __name__ == "__main__":
    try:
        # Read JSON string from stdin
        input_json = sys.stdin.read()
        
        # Parse the JSON input
        data = json.loads(input_json)

        # Extract the arguments from the parsed JSON
        user_prompt = data['userMessage']
        # model_version = data.get('selectedModel', 'gpt-4')
        conversation_history = data.get('conversationHistory', [])

        # Call the compute function and get the result
        result = compute(user_prompt, 'gpt-4', conversation_history)

        # Print the result as a JSON string
        print(json.dumps(result))
    except Exception as e:
        # Capture and print the full stack trace
        error_traceback = traceback.format_exc()
        print(json.dumps({"error": str(e), "traceback": error_traceback}))
