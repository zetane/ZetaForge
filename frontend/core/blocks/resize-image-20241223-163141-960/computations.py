
def compute(image_path, width, height):
    '''
    Resizes an image to the specified width and height.

    Parameters:
    image_path (str): The file path to the image that needs to be resized.
    width (int): The desired width for the resized image.
    height (int): The desired height for the resized image.

    Returns:
    dict: A dictionary with the key 'resized_image_path' and the value as the file path to the resized image.
    '''
    import os
    from PIL import Image
    
    # Open the image file
    with Image.open(image_path) as img:
        # Resize the image
        resized_img = img.resize((width, height))
        
        # Create a new file path for the resized image
        base, ext = os.path.splitext(image_path)
        resized_image_path = f"{base}_resized{ext}"
        
        # Save the resized image
        resized_img.save(resized_image_path)
    
    return {'resized_image_path': resized_image_path}


def generate_fake_image(path):
    from PIL import Image
    import numpy as np

    # Create a random image array
    random_image_array = np.random.rand(100, 100, 3) * 255
    random_image = Image.fromarray(random_image_array.astype('uint8')).convert('RGB')
    
    # Save the image
    random_image.save(path)


def test_compute():
    import os
    # Define the path for a fake image
    fake_image_path = 'fake_image.jpg'
    
    # Generate a fake image
    generate_fake_image(fake_image_path)
    
    # Set dimensions for resizing
    width = 50
    height = 50
    
    # Call the compute function
    result = compute(fake_image_path, width, height)

    # Check if the resized image exists
    resized_image_path = result.get('resized_image_path')
    if os.path.exists(resized_image_path):
        print("Test passed: Resized image was created.")
    else:
        print("Test failed: Resized image was not created.")

    # Clean up the fake and resized images after testing
    if os.path.exists(fake_image_path):
        os.remove(fake_image_path)
    if os.path.exists(resized_image_path):
        os.remove(resized_image_path)
