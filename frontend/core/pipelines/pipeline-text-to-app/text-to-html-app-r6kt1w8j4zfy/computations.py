from openai import OpenAI
import re

def compute(prompt, api_key):
    """
    Communicates with the OpenAI API to generate an HTML page based on the given prompt and accessible assets.

    Args:
        prompt (str): The detailed description for the application to be built.
        api_key (str): The API key to authenticate with the OpenAI API.

    Returns:
        dict: A dictionary containing the generated HTML page.
    """
  
    role = """You are an assistant that generates a full HTML page based on user input. All the code should be in one HTML page and use CDN. 
    Insert in the head ld+json metadata describing the application in a way that follows the exact example template below.
    Example for a photo editor application:
    <script type="application/ld+json">{
        "@context": "http://schema.org",
        "@type": "WebPage",
        "name": "Photo Editor Tool",
        "description": "A simple photo editing tool.",
        "category": "Tools",
        "keywords": [
            "Photo",
            "Editor",
            "Image"
        ],
        "creator": {
            "@type": "Person",
            "name": "Zetane"
        }
    }</script>"""
    
    print(role)

    preamble = """Build an application based on the following detailed description and use web icons such as font awesome instead of images. 
    Resize the images accordingly based on what they are and be sized to fit the canvas. 
    Be careful about flex and positions.
    Stretch the canvas to the parent.
    Do not use alerts.
    Importantly, implement all features and functionalities.\n\n"""

    prompt_to_send = preamble + prompt

    client = OpenAI(api_key=api_key)
    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": role},
            {"role": "user", "content": prompt}
        ],
        temperature=0.0
    )
  
    # Extract the response content
    response_content = completion.choices[0].message.content
    print(response_content)
    
    # Find the HTML content in the response
    html_match = re.search(r'```html\n(.*?)\n```', response_content, re.DOTALL)

    file_path = 'generated_app.html'
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(html_match.group(1))
    print(f"File saved at: {file_path}")
    
    return {"htlm": file_path, "content": html_match.group(1)}

def test():
    """Test the compute function."""
