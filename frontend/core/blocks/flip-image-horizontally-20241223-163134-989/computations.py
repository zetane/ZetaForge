
def compute(image_path):
    '''
    Flips an image horizontally.

    Parameters:
    image_path (str): The file path to the image that needs to be flipped horizontally.

    Returns:
    dict: A dictionary with the key 'flipped_image_path' and the value as the file path to the new image that has been flipped horizontally.
    '''
    import os
    from PIL import Image
    
    # Open the image file
    with Image.open(image_path) as img:
        # Flip the image horizontally
        flipped_img = img.transpose(Image.FLIP_LEFT_RIGHT)
        
        # Create a new file path for the flipped image
        base, ext = os.path.splitext(image_path)
        flipped_image_path = f"{base}_flipped{ext}"
        
        # Save the flipped image
        flipped_img.save(flipped_image_path)
    
    return {'flipped_image_path': flipped_image_path}


def generate_test_image():
    from PIL import Image
    import numpy as np
    
    # Create a 10x10 white image
    img = Image.fromarray(np.ones((10, 10, 3), dtype=np.uint8) * 255, 'RGB')
    img.save('test_image.jpg')
    return 'test_image.jpg'


def test_compute():
    # Import necessary module
    import os

    # Generate a test image to use
    image_path = generate_test_image()

    # Call the compute function with the test image path
    result = compute(image_path)
    print(f"Flipped image path: {result['flipped_image_path']}")

    # Check if the flipped image file has been created
    assert os.path.exists(result['flipped_image_path'])

    # Clean up test images
    os.remove(image_path)
    os.remove(result['flipped_image_path'])
