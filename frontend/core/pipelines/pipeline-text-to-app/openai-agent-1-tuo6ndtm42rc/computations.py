from openai import OpenAI
import re
import json

def compute(prompt, api_key):
    """
    Communicates with the OpenAI API to generate a completion based on the given role and prompt.

    Args:
        role (str): The role of the system for the chat model (e.g., "You are a copywriter...").
        prompt (str): The prompt to be provided to the user in the chat model.
        api_key (str): The API key to authenticate with the OpenAI API.

    Returns:
        str: The content of the generated response from the OpenAI API.
    """
  
    role = """You are an assistant that takes a user input text and generates a detailed textual description of a web application (e.g., tool) without code. 
    Importantly, give only a textual description, no code should be given.

    Note that this web application needs to be in one index.html file without a backend. 
    You need to describe the application, 
    give all the components of the application along with technical description and 
    describe the application dynamics and outline of how to implement it.
    """
  
    client = OpenAI(api_key=api_key)
    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": role},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1
    )
  
    # Extract the response content
    response_content = completion.choices[0].message.content
    
    return {"response": response_content}

def test():
    """Test the compute function."""
