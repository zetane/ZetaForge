import uuid
import os
import zipfile
import html

def escape_content(content):
    # First escape using html.escape
    escaped_content = html.escape(content)
    # Then manually replace backticks with their HTML entity
    escaped_content = escaped_content.replace('`', '&#96;').replace('$', '&#36;')
    return escaped_content

def compute(initial_content, api_key, image_paths):
    """Tool to generate HTML apps interfaces using the OpenAI API.

    Inputs:
        api_key (str): API key to be included in the generated HTML page.
        initial_content (str): Initial HTML content to be embedded in the generated HTML page.
        image_paths (list): List of image paths to be included and saved locally.

    Outputs:
        dict: A dictionary with the key 'html' and the value being the name of the generated HTML file.
    """

    # Load the HTML template
    with open('template.html', 'r') as file:
        html_template = file.read()

    # Escape the initial content and API key
    escaped_initial_content = escape_content(initial_content)
    escaped_api_key = escape_content(api_key)

    # Replace the placeholder with the actual content and image paths
    html_code = (html_template.replace('<< api_key >>', escaped_api_key)
                                .replace('<< initial_content >>', escaped_initial_content))

    # Write the file
    unique_id = str(uuid.uuid4())
    html_path = f"/files/viz_{unique_id}.html"

    with open(html_path, "w") as file:
        file.write(html_code)

    return {"html": f"viz_{unique_id}.html"}

def test():
    """Test the compute function."""
    print("Running test")
