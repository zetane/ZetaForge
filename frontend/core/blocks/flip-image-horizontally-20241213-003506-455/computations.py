
def compute(image_path):
    '''
    Flips an image horizontally.

    Parameters:
    image_path (str): The file path to the image that needs to be flipped horizontally.

    Returns:
    dict: A dictionary with the key 'flipped_image_path' and the value being the file path to the new image that has been flipped horizontally.
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


def create_fake_image(path):
    from PIL import Image
    import numpy as np

    # Create a random image and save it
    array = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)
    img = Image.fromarray(array)
    img.save(path)


def test_compute():
    import os

    # Create a fake image
    image_path = "test_image.jpg"
    create_fake_image(image_path)

    # Run the compute function
    result = compute(image_path)
    print("Flipped image saved at:", result['flipped_image_path'])

    # Clean up the generated image files
    if os.path.exists(image_path):
        os.remove(image_path)
    if os.path.exists(result['flipped_image_path']):
        os.remove(result['flipped_image_path'])
