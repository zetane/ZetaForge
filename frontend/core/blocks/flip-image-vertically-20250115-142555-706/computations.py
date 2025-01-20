
def compute(image_path):
    '''
    Flips an image vertically.

    Parameters:
    image_path (str): The file path to the image that needs to be flipped vertically.

    Returns:
    dict: A dictionary with the key 'flipped_image_path' containing the file path to the new image that has been flipped vertically.
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

def generate_fake_image():
    from PIL import Image
    import numpy as np
    image_array = np.random.rand(100, 100, 3) * 255
    img = Image.fromarray(image_array.astype('uint8')).convert('RGB')
    fake_image_path = 'fake_image.jpg'
    img.save(fake_image_path)
    return fake_image_path

def test_compute():
    image_path = generate_fake_image()
    result = compute(image_path)
    print(result)
