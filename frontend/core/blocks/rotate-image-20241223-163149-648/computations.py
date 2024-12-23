
def compute(image_path, degrees):
    '''
    Rotates an image by a specified number of degrees.

    Parameters:
    image_path (str): The file path to the image that needs to be rotated. The image should be in a standard format such as JPEG, PNG, etc.
    degrees (int): The number of degrees to rotate the image. Positive values will rotate the image clockwise, while negative values will rotate it counterclockwise.

    Returns:
    dict: A dictionary with the key 'rotated_image_path' and the value being the file path to the rotated image.
    '''
    from PIL import Image
    import os

    # Open the image file
    with Image.open(image_path) as img:
        # Rotate the image
        rotated_img = img.rotate(-degrees, expand=True)
        
        # Get the file extension
        file_extension = os.path.splitext(image_path)[1]
        
        # Create a new file path for the rotated image
        rotated_image_path = os.path.splitext(image_path)[0] + '_rotated' + file_extension
        
        # Save the rotated image
        rotated_img.save(rotated_image_path)

    return {'rotated_image_path': rotated_image_path}


def generate_sample_image():
    from PIL import Image
    import numpy as np
    
    width, height = 100, 100
    # Random image for testing
    random_image_array = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    
    image = Image.fromarray(random_image_array)
    image_path = 'test_image.png'
    image.save(image_path)
    return image_path


def test_compute():
    image_path = generate_sample_image()
    degrees = 45
    
    result = compute(image_path, degrees)
    print(result)
