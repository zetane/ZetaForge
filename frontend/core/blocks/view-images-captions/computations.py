import json
import uuid

def compute(image_paths, captions):
    """Generates an HTML file with a unique name and returns the file name.

    Inputs:
        image_paths (list): A list of image paths to display in the gallery.
        captions (list): A list of captions corresponding to the images.

    Outputs:
        dict: A dictionary with the key 'html' and the value being the name of the generated HTML file.
    """

    # Remove '/app/' from image paths
    image_paths = [path.replace("/app/", "") for path in image_paths]

    # HTML template with placeholders for images and captions
    html_template = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Gallery</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href='https://fonts.googleapis.com/css?family=Roboto' rel='stylesheet'>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.css" />
    <script src="https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.umd.js"></script>
    <style>
        body {
            margin-right: 30px;
            margin-left: 30px;
            font-size: 16px;
            font-family: 'Roboto';
        }

        .gallery {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
        }

        .gallery-item {
            margin: 10px;
            text-align: center;
        }

        .gallery img {
            height: 350px;
            object-fit: cover;
            cursor: pointer;
        }

        .caption {
            margin-top: 5px;
            font-weight: bold;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div id="image_gallery" class="gallery"></div>
    <script>
        $(document).ready(function(){
            const images = $image_paths;
            const captions = $captions;

            var gallery = $('#image_gallery');
            gallery.empty();

            images.forEach(function (image, index) {
                var $newImage = $('<div class="gallery-item">' +
                    '<a href="' + image + '" data-fancybox="gallery" data-caption="' + captions[index] + '">' +
                    '<img src="' + image + '" /></a>' +
                    '<div class="caption">' + captions[index] + '</div>' +
                    '</div>');
                gallery.append($newImage);
            });
        });
    </script>
</body>
</html>
    """

    # Ensure image_paths and captions are lists and of equal length
    if isinstance(image_paths, str):
        image_paths = [image_paths]

    if isinstance(captions, str):
        captions = [captions]

    if len(image_paths) != len(captions):
        raise ValueError("The number of image paths and captions must be the same.")

    # Generate a unique HTML file
    unique_id = str(uuid.uuid4())
    html_path = f"/files/viz_{unique_id}.html"
    
    # Convert lists to JSON for embedding into the HTML template
    image_paths_str = json.dumps(image_paths)
    captions_str = json.dumps(captions)
    
    # Replace placeholders in the HTML template
    html_code = html_template.replace("$image_paths", image_paths_str)
    html_code = html_code.replace("$captions", captions_str)

    # Write the HTML file
    with open(html_path, "w") as file:
        file.write(html_code)

    return {"html": f"viz_{unique_id}.html"}

def test():
    """Test the compute function."""
    print("Running test")