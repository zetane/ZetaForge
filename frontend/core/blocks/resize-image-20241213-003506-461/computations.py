
def compute(image_path, width, height):
    '''
    Resizes an image to the specified width and height.

    Parameters:
    image_path (str): The file path to the image that needs to be resized.
    width (int): The desired width for the resized image.
    height (int): The desired height for the resized image.

    Returns:
    dict: A dictionary with the key 'resized_image_path' and the value as the file path to the resized image.
    '''
    from PIL import Image
    import os

    # Open the image file
    with Image.open(image_path) as img:
        # Resize the image
        resized_img = img.resize((width, height))

        # Create a new file path for the resized image
        base, ext = os.path.splitext(image_path)
        resized_image_path = f"{base}_resized{ext}"

        # Save the resized image
        resized_img.save(resized_image_path)

    return {'resized_image_path': resized_image_path}

import numpy as np
from PIL import Image
import tempfile

# Function to generate fake image

def generate_fake_image():
    # Create a random numpy array representing an image
    random_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    return random_image

# Function to save fake image to a temporary path

def save_fake_image(fake_image_array):
    temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    fake_image = Image.fromarray(fake_image_array)
    fake_image.save(temp_file.name)
    return temp_file.name

# Test function

def test_compute():
    # Generate a fake image
    fake_image_array = generate_fake_image()
    # Save the fake image and get its path
    fake_image_path = save_fake_image(fake_image_array)
    # Set new width and height
    new_width = 50
    new_height = 50
    # Call compute function
    result = compute(fake_image_path, new_width, new_height)
    # Print result
    print(result)
