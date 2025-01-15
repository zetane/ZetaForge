
def compute(image_path, degrees):
    '''
    Rotates an image by a specified number of degrees.

    Parameters:
    image_path (str): The file path to the image that needs to be rotated.
    degrees (int): The number of degrees to rotate the image. Positive values rotate the image clockwise, while negative values rotate it counterclockwise.

    Returns:
    dict: A dictionary with the key 'rotated_image_path' and the value as the file path to the rotated image.
    '''
    from PIL import Image
    import os

    # Open the image file
    with Image.open(image_path) as img:
        # Rotate the image
        rotated_img = img.rotate(-degrees, expand=True)

        # Create a new file path for the rotated image
        base, ext = os.path.splitext(image_path)
        rotated_image_path = f"{base}_rotated{ext}"

        # Save the rotated image
        rotated_img.save(rotated_image_path)

    return {'rotated_image_path': rotated_image_path}


def generate_fake_image():
    import numpy as np
    from PIL import Image
    import io

    # Create a 100x100 red image
    array = np.ones((100, 100, 3), dtype=np.uint8) * 255  # red color

    # Open as Image object
    image = Image.fromarray(array)
    temp_image_path = "temp_image.jpg"
    
    # Save the image for test use
    image.save(temp_image_path)
    return temp_image_path


def test_compute():
    from PIL import Image
    import os

    # Generate a fake image for testing
    try:
        image_path = generate_fake_image()
        
        # Call the compute function
        result = compute(image_path, 90)

        # Check if the rotated image path is returned
        assert 'rotated_image_path' in result

        # Check if the rotated image exists
        assert os.path.isfile(result['rotated_image_path'])
        print("Test passed!")

    except Exception as e:
        print(f"Error: {e}")
