from rembg import remove
from PIL import Image
import io

def compute(input_image_path):
    '''
    This function takes the path to an image file, removes its background, and saves the resulting image to a new file.
    The function returns the path to the output image.

    Parameters:
    - input_image_path (str): Path to the input image file.

    Returns:
    - dict: A dictionary containing the path to the output image with the key 'output_path'.
    '''

    # Load the input image
    with open(input_image_path, 'rb') as input_file:
        input_image = input_file.read()

    # Perform background removal
    output_image = remove(input_image)

    # Save the output image
    output_image_path = f'image_with_no_background.png'
    output_image = Image.open(io.BytesIO(output_image))
    output_image.save(output_image_path)

    return {'output_path': output_image_path}

def test():
    """Test the compute function."""
    print("Running test")