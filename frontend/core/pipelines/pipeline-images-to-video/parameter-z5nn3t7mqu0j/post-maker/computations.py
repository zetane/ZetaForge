import json
import re
import os
from openai import OpenAI


def agent(role, prompt, api_key):
    client = OpenAI(api_key=api_key)
    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": role},
            {"role": "user", "content": prompt}
        ],
        temperature=0.0
    )
    return completion

def calculate_openai_cost(input_tokens, output_tokens):
    cost_input = (input_tokens * 5) / 1000000
    cost_output = (output_tokens * 15) / 1000000
    total = cost_input + cost_output
    return f'Prompt cost: ${cost_input}, Output cost: ${cost_output}, Total cost: ${total}'

def extract_json_string(response_text):
    """
    Extracts JSON string from the response text.
    """
    match = re.search(r'```json\s*(\{.*\})\s*```', response_text, re.DOTALL)
    if match:
        return match.group(1)
    return None

def compute(content, theme, tone, api_key):
    """
    Generates a post based on requested content, a theme of the week and message tone.
    """
    
    role = "You are a copywriter that writes social media posts for LinkedIn, Instagram, Facebook and Twitter (or X)."

    prompt = f"""
    Write a post based on the following content description, a general theme and required tone.

    Here is the post content description:
    {content}

    Here is the theme of the week:
    {theme}

    Here is the tone:
    {tone}

    Produce a json that has LinkedIn, Instagram, Facebook and X keys with the message content.
    """

    completion = agent(role, prompt, api_key)
    cost = calculate_openai_cost(completion.usage.prompt_tokens, completion.usage.completion_tokens)
    print("API usage:", completion.usage)
    print(cost)

    raw_response = completion.choices[0].message.content
    print("Raw response:", raw_response)  # Debugging output to inspect the raw response

    json_string = extract_json_string(raw_response)
    if json_string:
        try:
            response_json = json.loads(json_string)
        except json.JSONDecodeError as e:
            print("JSONDecodeError:", e)
            response_json = None
    else:
        print("No JSON string found in the response.")
        response_json = None

    return {"LinkedIn": response_json["LinkedIn"], "Instagram": response_json["Instagram"], "Facebook": response_json["Facebook"], "X": response_json["X"]}

