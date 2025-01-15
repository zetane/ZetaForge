
def compute(image_path):
    '''
    Flips an image horizontally.

    This function takes the path to an image file, flips the image horizontally,
    and saves the flipped image to a new file. The path to the new image file is returned.

    Parameters:
    image_path (str): The file path to the image that needs to be flipped horizontally.

    Returns:
    dict: A dictionary containing the path to the new image file with the key 'flipped_image_path'.
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


def generate_dummy_image():
    from PIL import Image
    import numpy as np
    import tempfile

    # Create a dummy image (e.g., 100x100 pixels)
    dummy_image = Image.fromarray(np.uint8(np.random.rand(100, 100, 3) * 255))
    
    # Save the image to a temporary file
    temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    dummy_image_path = temp_file.name
    dummy_image.save(dummy_image_path)
    temp_file.close()
    
    return dummy_image_path


def test_compute():
    # Generate a dummy image for testing
    dummy_image_path = generate_dummy_image()
    
    # Call the compute function
    output = compute(dummy_image_path)
    
    # Print the output
    print(output)

