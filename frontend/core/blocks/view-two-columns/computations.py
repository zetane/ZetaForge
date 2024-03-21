import json
import uuid


def compute(array_of_pairs):
    """Generates an HTML file displaying image and text pairs in columns.

    Inputs:
        array_of_pairs (list): A list of dictionaries, each containing image and text pairs.

    Outputs:
        dict: A dictionary with the key 'html' and the value being the name of the generated HTML file.

    Requirements:
    """

    html_template = """<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image and Text in Columns</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css">

    <style>
        body {
            background-color: #111111;
        }

        .container {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .pair {
            display: flex;
            margin-bottom: 50px;
            width: 100%;
            justify-content: space-between;
        }

        .image-container {
            position: relative;
            width: 100%;
            display: inline-block;
            margin-right: 35px;
        }

        .pair img {
            width: 100%;
            height: auto;
            cursor: pointer;
        }

        .image-overlay {
            position: absolute;
            top: 0;
            right: 0;
            background-color: rgba(0, 0, 0, 0.6);
            padding: 10px;
            display: none;
            font-size: 20px;
            color: white;
            text-decoration: none;
        }

        .image-overlay:hover {
            color: lightgray;
        }

        .image-container:hover .image-overlay {
            display: block;
        }

        .pair p {
            margin: 0;
            margin-right: 35px;
            padding-left: 20px;
            padding-right: 40px;
            width: 80%;
            font-size: 24px;
            background-color: white;
            color: black;
            border-radius: 5px;
            position: relative;
            border: 1px solid black;
            height: 200px;
            overflow: auto;
            box-sizing: border-box;
        }

        .inner-text {
            padding-top: 20px;
            padding-bottom: 20px;
        }


        .copy-icon {
            position: absolute;
            top: 10px;
            right: 10px;
            cursor: pointer;
            font-size: 24px;
        }

        .tooltip {
            display: none;
            position: absolute;
            top: 15px;
            right: 40px;
            background-color: #555;
            color: white;
            padding: 5px;
            border-radius: 5px;
            font-size: 14px;
        }

        img:not(:valid) {
            color: gray;
        }
    </style>
</head>

<body>
    <div class="container"></div>
    <script>

        const inputs = $object_array;

        const container = document.querySelector(".container");

        function addPair(col1_type, col1_content, col2_type, col2_content, imageDescription = 'image') {
            const pairDiv = document.createElement('div');
            pairDiv.className = 'pair';

            if (col1_type == "image") {
                createImageElement(pairDiv, col1_content, imageDescription);
            } else if (col1_type == "text") {
                createTextElement(pairDiv, col1_content, 'navy', 'white');
            }

            if (col2_type == "image") {
                createImageElement(pairDiv, col2_content, imageDescription);
            } else if (col2_type == "text") {
                createTextElement(pairDiv, col2_content);
            }

            container.appendChild(pairDiv);
        }

        function createImageElement(parentDiv, imagePath, imageDescription) {
            const imgDiv = document.createElement('div');
            imgDiv.className = 'image-container';

            const img = document.createElement('img');
            img.src = imagePath;
            img.alt = imageDescription;

            const overlayDiv = document.createElement('a');
            overlayDiv.className = 'image-overlay';
            overlayDiv.href = imagePath;
            overlayDiv.setAttribute('download', imageDescription);
            const downloadIcon = document.createElement('i');
            downloadIcon.className = 'fa fa-download';
            overlayDiv.appendChild(downloadIcon);

            imgDiv.appendChild(img);
            imgDiv.appendChild(overlayDiv);
            parentDiv.appendChild(imgDiv);
        }

        function createTextElement(parentDiv, text, background_color = 'white', font_color = 'black') {
            const p = document.createElement('p');
            p.style.backgroundColor = background_color;
            p.style.color = font_color;
            const innerTextDiv = document.createElement('div');
            innerTextDiv.className = 'inner-text';
            innerTextDiv.innerHTML = text;
            innerTextDiv.style.backgroundColor = background_color;
            innerTextDiv.style.color = font_color;
            p.appendChild(innerTextDiv);

            const copyIcon = document.createElement('i');
            copyIcon.className = 'fa fa-copy copy-icon';
            copyIcon.onclick = function () {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);

                // Tooltip logic
                tooltip.style.display = 'block';
                setTimeout(() => {
                    tooltip.style.display = 'none';
                }, 2000);
            }
            const tooltip = document.createElement('span');
            tooltip.className = 'tooltip';
            tooltip.textContent = 'Copied!';
            p.appendChild(copyIcon);
            p.appendChild(tooltip);

            parentDiv.appendChild(p);
        }

        // inputs.forEach(i => addPair('text', i.description, 'text', i.action));
        // inputs.forEach(i=> addPair('image', i.filename, 'text', i.description));
        function determineType(value) {
            if (value && typeof value === "string" && (value.endsWith('.png') || value.endsWith('.jpg') || value.endsWith('.jpeg'))) {
                return "image";
            }
            return "text";
        }

        inputs.forEach(i => {
            const keys = Object.keys(i);
            const firstType = determineType(i[keys[0]]);
            const secondType = determineType(i[keys[1]]);
            
            addPair(firstType, i[keys[0]], secondType, i[keys[1]]);
        });
    </script>
</body>

</html>
    """
    unique_id = str(uuid.uuid4())

    html_path = f"viz_{unique_id}.html"

    image_paths_view_str = json.dumps(array_of_pairs)

    html_code = html_template.replace("$object_array", image_paths_view_str)

    # Write the file
    with open(html_path, "w") as file:
        file.write(html_code)

    return {"html": f"viz_{unique_id}.html"}


def test():
    """Test the compute function."""

    print("Running test")
