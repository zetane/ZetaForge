
def compute(image_path, width, height):
    '''
    Resizes an image to the specified width and height.

    Parameters:
    image_path (str): The file path to the image that needs to be resized.
    width (int): The desired width for the resized image.
    height (int): The desired height for the resized image.

    Returns:
    dict: A dictionary with the key 'resized_image_path' containing the file path to the resized image.
    '''
    import os
    from PIL import Image

    # Open the input image
    with Image.open(image_path) as img:
        # Resize the image
        resized_img = img.resize((width, height))

        # Create a new file path for the resized image
        base, ext = os.path.splitext(image_path)
        resized_image_path = f"{base}_resized{ext}"

        # Save the resized image
        resized_img.save(resized_image_path)

    return {'resized_image_path': resized_image_path}


def generate_fake_image(width, height):
    from PIL import Image
    import numpy as np

    # Create a random image using numpy
    array = np.random.randint(0, 256, (height, width, 3), dtype=np.uint8)
    image = Image.fromarray(array, 'RGB')

    # Save the generated image to a temporary path
    fake_image_path = "fake_image.jpg"
    image.save(fake_image_path)
    return fake_image_path


def test_compute():
    # Import necessary modules
    import os
    width, height = 100, 100
    
    # Generate a fake image file
    fake_image_path = generate_fake_image(width, height)

    # Call the compute function to test
    result = compute(fake_image_path, width, height)
    result_path = result['resized_image_path']

    # Check if the resized image file was created
    assert os.path.exists(result_path), "The resized image was not created!"
    
    # Clean up fake images
    os.remove(fake_image_path)
    os.remove(result_path)
