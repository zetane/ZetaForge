import uuid
import shutil
import os


def compute(audio_paths):
    """Generates an HTML file with an audio player per input file.

    Inputs:
        audio_paths (list): A list of audio paths or a single audio path.

    Outputs:
        dict: A dictionary with the key 'html' and the value being the name of the generated HTML file.
    """

    if isinstance(audio_paths, str):
        audio_paths = [audio_paths]

    css_style = """
    <style>
        body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f0f0f0;
            font-family: 'Arial', sans-serif;
        }
        audio {
            width: 60%;              /* Control the width of the audio player */
            margin: 10px 0;          /* Add vertical spacing between players */
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); /* Subtle shadow for 3D effect */
            border-radius: 10px;     /* Rounded corners for the player */
        }
        h3 {
            margin: 20px 0 0;        /* Spacing above the file name */
            color: #333;
            font-size: 16px;
        }
    </style>
    """

    audio_controls = ""
    for path in audio_paths:
        filename = path.split('/')[-1]
        audio_controls += f'<h3>{filename}</h3>\n<audio controls src="{path}" preload="none">Your browser does not support the audio element.</audio>\n'

    html_template = f"""
    <html>
    <head>
        <title>Audio Player</title>
        {css_style}
    </head>
    <body>
        {audio_controls}
    </body>
    </html>
    """
    unique_id = str(uuid.uuid4())
    
    html_path = f"viz_{unique_id}.html"
    html_code = html_template

    for path in audio_paths:
        shutil.move(os.path.abspath(path), f"{path}")

    with open(html_path, "w") as file:
        file.write(html_code)

    return {"html": f"viz_{unique_id}.html"}



def test():
    """Test the compute function."""

    print("Running test")
