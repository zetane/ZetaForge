import json
import uuid

def compute(media_paths_view):
    """Generates an HTML file with a unique name and returns the file name.

    Inputs:
        media_paths_view (str or list): A path or a list of media paths (videos) to display in the gallery.

    Outputs:
        dict: A dictionary with the key 'html' and the value being the name of the generated HTML file.
    """

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

        .gallery a {
            margin: 10px;
        }

        .gallery video {
            height: 350px;
            object-fit: cover;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div id="media_gallery" class="gallery"></div>
    <script>
        Fancybox.bind("[data-fancybox]", {
            // Your custom options
        });
    </script>
    <script>
        $(document).ready(function(){
            const paths = $media_paths;

            console.log('Paths', paths)

            var myElement_to_clear = $('#media_gallery');
            myElement_to_clear.empty();

            paths.map(function (p) {
                var $newVideo = $('<a href="' + p + '" data-fancybox="gallery" data-caption="' + p + '"><video controls><source src="' + p + '" type="video/mp4"></video></a>');
                myElement_to_clear.append($newVideo);
            })
        });
    </script>
</body>
</html>
    """
    # Ensure media_paths_view is always a list
    if isinstance(media_paths_view, str):
        media_paths_view = [media_paths_view]

    unique_id = str(uuid.uuid4())
    html_path = f"/files/viz_{unique_id}.html"
    media_paths_view_str = json.dumps(media_paths_view)
    html_code = html_template.replace("$media_paths", media_paths_view_str)

    # Write the file
    with open(html_path, "w") as file:
        file.write(html_code)

    return {"html": f"viz_{unique_id}.html"}

def test():
    """Test the compute function."""
    print("Running test")
