
def compute(image_path, degrees):
    '''
    Rotates an image by a specified number of degrees.

    Parameters:
    image_path (str): The file path to the image that needs to be rotated.
    degrees (int): The number of degrees by which the image should be rotated. Positive values rotate the image clockwise, while negative values rotate it counterclockwise.

    Returns:
    dict: A dictionary with the key 'rotated_image_path' and the value being the file path to the rotated image.
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


def generate_test_image():
    from PIL import Image
    import numpy as np
    img_array = np.random.rand(100, 100, 3) * 255
    img = Image.fromarray(img_array.astype('uint8')).convert('RGB')
    test_image_path = 'test_image.jpg'
    img.save(test_image_path)
    return test_image_path


def test_compute():
    test_image_path = generate_test_image()
    try:
        result = compute(test_image_path, 90)
        print(result)
    except Exception as e:
        print(f"Error testing compute function: {e}")
