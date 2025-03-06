import json
import uuid

def compute(data_view):
    """Generates an HTML file with a unique name and returns the file name.

    Inputs:
        data_view (str, dict, or list): A string, dictionary, or list of dictionaries to display in the gallery.

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
            white-space: pre-wrap; /* Maintains whitespace formatting */
            overflow-wrap: break-word; /* Ensures long text breaks and wraps to next line */
        }
    </style>
</head>
<body>
    <div id="data_gallery" class="gallery"></div>
    <script>
        $(document).ready(function(){
            const data = $data_paths;

            console.log('Data', data)

            var galleryElement = $('#data_gallery');
            galleryElement.empty();

            data.map(function (item) {
                var $newDataItem = $('<div class="data-item"></div>');
                $newDataItem.text(JSON.stringify(item, null, 4)); // Use a 4-space indent for pretty-printing
                galleryElement.append($newDataItem);
            })
        });
    </script>
</body>
</html>
    """
    # Ensure data_view is always a list
    if isinstance(data_view, (str, dict)):
        data_view = [data_view]

    unique_id = str(uuid.uuid4())
    html_path = f"/files/data_viz_{unique_id}.html"
    data_view_str = json.dumps(data_view, indent=4)  # Pretty-print JSON data in the HTML file generation
    html_code = html_template.replace("$data_paths", data_view_str)

    # Write the file
    with open(html_path, "w") as file:
        file.write(html_code)

    return {"html": f"data_viz_{unique_id}.html"}

def test():
    """Test the compute function with various data types and print the test cases and their results."""
    test_cases = [
        "Single string",
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

