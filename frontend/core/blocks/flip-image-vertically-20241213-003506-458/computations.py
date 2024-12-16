
def compute(image_path):
    '''
    Flips an image vertically.

    Parameters:
    image_path (str): The file path to the image that needs to be flipped vertically.

    Returns:
    dict: A dictionary with the key 'flipped_image_path' and the value being the file path to the new image that has been flipped vertically.
    '''
    import os
    from PIL import Image
    
    # Open the image file
    with Image.open(image_path) as img:
        # Flip the image vertically
        flipped_img = img.transpose(Image.FLIP_TOP_BOTTOM)
        
        # Create a new file path for the flipped image
        base, ext = os.path.splitext(image_path)
        flipped_image_path = f"{base}_flipped{ext}"
        
        # Save the flipped image
        flipped_img.save(flipped_image_path)
    
    return {'flipped_image_path': flipped_image_path}

import numpy as np
from PIL import Image

def generate_fake_image():
    # Create a fake image array
    width, height = 100, 100
    image_array = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    fake_image = Image.fromarray(image_array)
    fake_image_path = 'fake_image.jpg'
    fake_image.save(fake_image_path)
    return fake_image_path


def test_compute():
    image_path = generate_fake_image()
    result = compute(image_path)
    print(result)
