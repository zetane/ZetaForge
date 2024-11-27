import json
import uuid
import markdown  # Use the markdown library to convert Markdown to HTML

def convert_markdown_in_structure(data):
    """Recursively searches for Markdown strings in data structures and converts them to HTML."""
    if isinstance(data, dict):
        return {key: convert_markdown_in_structure(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_markdown_in_structure(item) for item in data]
    elif isinstance(data, str) and (data.startswith("#") or data.startswith("-")):  # Check if Markdown format
        return markdown.markdown(data)  # Convert Markdown to HTML
    else:
        return data

def compute(data_view):
    """Generates an HTML file with a unique name and returns the file name.

    Inputs:
        data_view (str, dict, or list): A JSON string, dictionary, list of dictionaries, or Markdown text to display in the gallery.

    Outputs:
        dict: A dictionary with the key 'html' and the value being the name of the generated HTML file.
    """

    html_template = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Data Gallery</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href='https://fonts.googleapis.com/css?family=Roboto' rel='stylesheet'>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js"></script>
    <style>
        body {
            margin: 30px;
            font-size: 16px;
            font-family: 'Roboto';
        }

        .data-item {
            margin: 10px;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            background-color: #f8f8f8;
            white-space: pre-wrap;
            overflow-wrap: break-word;
        }

        .markdown-content {
            font-size: 16px;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div id="data_gallery" class="gallery"></div>
    <script>
        $(document).ready(function(){
            const data = $data_paths;

            var galleryElement = $('#data_gallery');
            galleryElement.empty();

            if (typeof data === "string" && data.startsWith("<")) {
                // If data is HTML, inject it directly
                galleryElement.html(data);
            } else {
                // If data is JSON, iterate and render each item
                data.forEach(function (item) {
                    var $newDataItem = $('<div class="data-item"></div>');
                    if (typeof item === "string") {
                        $newDataItem.html(item);  // Render HTML
                    } else {
                        $newDataItem.text(JSON.stringify(item, null, 4));  // Render JSON data
                    }
                    galleryElement.append($newDataItem);
                });
            }
        });
    </script>
</body>
</html>
    """

    # Parse data_view if it's a JSON string
    if isinstance(data_view, str):
        try:
            data_view = json.loads(data_view)
        except json.JSONDecodeError:
            pass  # Leave as string if not JSON

    # Convert Markdown within the data structure to HTML
    data_view_html = convert_markdown_in_structure(data_view)

    # Prepare data for HTML template
    data_for_html = json.dumps(data_view_html, indent=4) if not isinstance(data_view_html, str) else json.dumps(data_view_html)

    unique_id = str(uuid.uuid4())
    html_path = f"/files/data_viz_{unique_id}.html"
    html_code = html_template.replace("$data_paths", data_for_html)

    # Write the file
    with open(html_path, "w") as file:
        file.write(html_code)

    return {"html": f"data_viz_{unique_id}.html"}

def test():
    """Test the compute function with various data types and print the test cases and their results."""
    test_cases = [
        "{\"data_view\": \"# Docling Technical Report\\n\\nVersion 1.0\\n\\nThis is a test of complex Markdown content.\"}",
        "Simple string content",
        ["List", "of", "strings"],
        {"name": "Alice", "age": 30},
        [{"name": "Bob", "age": 25}, {"name": "Charlie", "age": 35}],
        json.dumps({"name": "Dave", "age": 40}),
        [json.dumps({"name": "Eve", "age": 45}), json.dumps({"name": "Frank", "age": 50})]
    ]

    for i, case in enumerate(test_cases):
        result = compute(case)
        print(f"Test case {i+1}: Input - {case}")
        print(f"Result: {result}\n")
