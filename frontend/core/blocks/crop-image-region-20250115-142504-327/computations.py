
def compute(image_path, coordinates):
    '''
    Crops a specific region from an image based on the provided coordinates.
    
    Parameters:
    image_path (str): The file path to the image from which a region will be cropped.
    coordinates (dict): A dictionary containing the coordinates for cropping. It includes 'x' and 'y' for the top-left corner, and 'width' and 'height' for the size of the region.

    Returns:
    dict: A dictionary with the key 'cropped_image_path' containing the file path to the cropped image.
    '''
    from PIL import Image
    import os

    # Open the image file
    with Image.open(image_path) as img:
        # Convert coordinate values to integers
        x = int(coordinates['x'])
        y = int(coordinates['y'])
        width = int(coordinates['width'])
        height = int(coordinates['height'])

        # Define the box to crop
        box = (x, y, x + width, y + height)

        # Crop the image
        cropped_img = img.crop(box)

        # Define the output path
        base, ext = os.path.splitext(image_path)
        output_image_path = f"{base}_cropped{ext}"

        # Save the cropped image
        cropped_img.save(output_image_path)

    return {'cropped_image_path': output_image_path}


def generate_test_image():
    from PIL import Image
    import numpy as np

    # Create a simple image using numpy
    data = np.zeros((100, 100, 3), dtype=np.uint8)
    data[25:75, 25:75] = [255, 0, 0]  # Red square in the middle

    # Convert numpy array to Image
    img = Image.fromarray(data, 'RGB')

    # Save it locally
    img.save('test_image.jpg')
    return 'test_image.jpg'


def test_compute():
    from PIL import Image

    image_path = generate_test_image()
    coordinates = {
        'x': 25,
        'y': 25,
        'width': 50,
        'height': 50
    }

    output = compute(image_path, coordinates)
    print(output)
