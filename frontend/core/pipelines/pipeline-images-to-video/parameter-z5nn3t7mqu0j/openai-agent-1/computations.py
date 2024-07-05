from openai import OpenAI

def compute(role, prompt, api_key):
    """
    Communicates with the OpenAI API to generate a completion based on the given role and prompt.

    Args:
        role (str): The role of the system for the chat model (e.g., "You are a copywriter...").
        prompt (str): The prompt to be provided to the user in the chat model.
        api_key (str): The API key to authenticate with the OpenAI API.

    Returns:
        str: The content of the generated response from the OpenAI API.
    """
    client = OpenAI(api_key=api_key)
    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": role},
            {"role": "user", "content": prompt}
        ],
        temperature=0.0
    )
  
    return {"response": completion.choices[0].message.content}

def test():
    """Test the compute function."""

    print("Running test")
