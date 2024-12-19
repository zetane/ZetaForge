import json
import re
import sys
import traceback
from openai import OpenAI
import openai

def get_fallback_model(original_model):
    """
    Returns an appropriate fallback model when the requested model is not available.
    Add more fallback cases as needed.
    """
    fallback_models = {
        'chatgpt-4o-latest': 'gpt-3.5-turbo',  # Primary fallback
        'gpt-4': 'gpt-3.5-turbo',
        'gpt-4-turbo': 'gpt-3.5-turbo',
    }

    return fallback_models.get(original_model, 'gpt-3.5-turbo')  # Default fallback

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

def make_api_call(client, model_version, messages, original_model=None):
    """
    Makes the API call with fallback handling
    """
    try:
        response = client.chat.completions.create(
            model=model_version,
            messages=messages,
            temperature=0.7
        )

        # Check if response is valid
        if not response or not response.choices or len(response.choices) == 0:
            raise Exception("Empty response received from OpenAI API")

        return response, model_version

    except openai.NotFoundError as e:
        # Model not found, attempt fallback
        if original_model is None:
            fallback_model = get_fallback_model(model_version)
            return make_api_call(client, fallback_model, messages, original_model=model_version)
        raise
    except openai.APIError:
        raise

def compute(user_prompt, model_version, conversation_history, apiKey):
    # Initialize the OpenAI client
    client = OpenAI(api_key=apiKey)

    # System message content
    system_content = """You are an assistant that generates python code and returns it in a way that must follow the template below.
    You absolutely need to give a python code section without abbreviation that follows the template. Do not put code lines at the root, but give only the functions and imports.

    By default, when requested to do change or add to the code, modify the latest code section. But when the user ask to do it on another section, do so.

    In the template, the function compute contains the code and the function test contains a series of call to compute that runs and prints multiple tests.

    Don't insert a __main__ section.

    Template:
    import ...

    def compute(in1, in2, in3,...):
        '''A textual description of the compute function.'''

        #some code
        return {'out1': out1, 'out2': out2, ...}

    def test():
        # Call compute multiple times based on a series of inputs. The outputs are then compare with the expected outputs. Print the results and indicate if the tests passed.
    """

    # Prepare messages array
    messages = [{"role": "system", "content": system_content}]

    # Add conversation history if it exists (only the last entry)
    if conversation_history:
        last_entry = conversation_history[-1]
        messages.append({"role": "user", "content": last_entry['prompt']})
        messages.append({"role": "assistant", "content": last_entry['response']})

    # Add the current user prompt
    messages.append({"role": "user", "content": user_prompt})

    try:
        # Make the API call with fallback handling
        response, used_model = make_api_call(client, model_version, messages)

        # Extract the response content
        response_content = response.choices[0].message.content

        # Keep only the python code
        code = extract_python_code(response_content)

        # Verify that code is not empty
        if not code or code.isspace():
            raise Exception("No valid Python code was generated")

        return {'response': code, 'model': used_model}

    except openai.APIConnectionError as e:
        raise Exception(f"The server could not be reached: {str(e.__cause__)}")
    except openai.RateLimitError as e:
        raise Exception("Rate limit exceeded. Please try again later.")
    except openai.AuthenticationError as e:
        raise Exception("Invalid API key provided.")
    except openai.BadRequestError as e:
        raise Exception(f"Bad request: {str(e)}")
    except openai.PermissionDeniedError as e:
        raise Exception(f"Permission denied: {str(e)}")
    except openai.NotFoundError as e:
        raise Exception(f"Resource not found: {str(e)}")
    except openai.UnprocessableEntityError as e:
        raise Exception(f"Unprocessable entity: {str(e)}")
    except openai.InternalServerError as e:
        raise Exception("OpenAI server error. Please try again later.")
    except Exception as e:
        raise Exception(f"Unexpected error: {str(e)}")

if __name__ == "__main__":
    try:
        # Read JSON string from stdin
        input_json = sys.stdin.read()

        # Parse the JSON input
        data = json.loads(input_json)

        # Extract the arguments from the parsed JSON
        user_prompt = data['userMessage']
        conversation_history = data.get('conversationHistory', [])
        apiKey = data["apiKey"]

        # Validate API key
        if not apiKey or not isinstance(apiKey, str) or len(apiKey.strip()) == 0:
            raise Exception("Invalid or missing API key")

        # Validate user prompt
        if not user_prompt or not isinstance(user_prompt, str) or len(user_prompt.strip()) == 0:
            raise Exception("Invalid or empty user prompt")

        # Call the compute function and get the result
        result = compute(user_prompt, 'chatgpt-4o-latest', conversation_history, apiKey)

        # Print the result as a JSON string
        print(json.dumps(result))
    except Exception as e:
        # Capture and print the full stack trace
        error_traceback = traceback.format_exc()

        # Determine the appropriate status code
        status_code = 500  # Default to internal server error
        if isinstance(e, openai.RateLimitError):
            status_code = 429
        elif isinstance(e, openai.AuthenticationError):
            status_code = 401
        elif isinstance(e, openai.PermissionDeniedError):
            status_code = 403
        elif isinstance(e, openai.NotFoundError):
            status_code = 404
        elif isinstance(e, openai.BadRequestError):
            status_code = 400
        elif isinstance(e, openai.UnprocessableEntityError):
            status_code = 422
        elif "Invalid or missing API key" in str(e):
            status_code = 401
        elif "Invalid or empty user prompt" in str(e):
            status_code = 400

        error_response = {
            "error": {
                "message": str(e),
                "status_code": status_code,
                "traceback": error_traceback,
                "type": e.__class__.__name__
            }
        }
        print(json.dumps(error_response))
