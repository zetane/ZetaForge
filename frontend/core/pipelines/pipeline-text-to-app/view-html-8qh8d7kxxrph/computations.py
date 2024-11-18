import uuid

def compute(html_path):
    """Display the input HTML page.

    Inputs:
        html_path: Path to the HTML file to be displayed.

    Outputs:
        dict: A dictionary with the key 'html' and the value being the name of the generated HTML file.
    """

    # Load the HTML template
    with open(html_path, 'r') as file:
        html_content = file.read()

    # Write the file
    unique_id = str(uuid.uuid4())
    html_path = f"/files/viz_{unique_id}.html"

    with open(html_path, "w") as file:
        file.write(html_content)

    return {"html": f"viz_{unique_id}.html"}

def test():
    """Test the compute function."""
    print("Running test")
