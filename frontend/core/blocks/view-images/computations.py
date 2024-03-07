import json
import uuid


def compute(image_paths_view):
    """Generates an HTML file with a unique name and returns the file name.

    Inputs:
        image_paths_view (list): A list of image paths to display in the gallery.

    Outputs:
        dict: A dictionary with the key 'html' and the value being the name of the generated HTML file.

    Requirements:
        json
        uuid
    """

    html_template = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Galery</title>
    <meta charset="utf-8">
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
        
        .gallery a {
            margin: 10px; 
        }
        
        .gallery img {
            height: 350px;
            /* width: 350px; */
            object-fit: cover;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div id="image_gallery" class="gallery"></div>
    <script>
        Fancybox.bind("[data-fancybox]", {
        // Your custom options
        });
    </script>
    <script>
        $(document).ready(function(){
            const paths = $image_paths;

            console.log('Paths', paths)

            var myElement_to_clear = $('#image_gallery');
            myElement_to_clear.empty();

            paths.map(function (p) {
                var $newImage = $('<a href="' + p + '" data-fancybox="gallery" data-caption="' + p + '"><img src="' + p + '" /></a>'
                );
                myElement_to_clear.append($newImage);
            })
        });
    </script>
</body>
</html>
    """
    unique_id = str(uuid.uuid4())

    html_path = f"/files/viz_{unique_id}.html"

    image_paths_view_str = json.dumps(image_paths_view)

    html_code = html_template.replace("$image_paths", image_paths_view_str)

    # Write the file
    with open(html_path, "w") as file:
        file.write(html_code)

    return {"html": f"viz_{unique_id}.html"}


def test():
    """Test the compute function."""

    print("Running test")
