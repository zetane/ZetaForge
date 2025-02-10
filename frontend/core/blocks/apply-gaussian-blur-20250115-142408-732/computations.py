
def compute(image_path, kernel_size):
    '''
    Applies a Gaussian blur to an image using a specified kernel size.

    Parameters:
    image_path (str): The file path to the input image that will be blurred.
    kernel_size (int): The size of the kernel to be used for the Gaussian blur. It must be a positive odd integer.

    Returns:
    dict: A dictionary with the key 'blurred_image_path' containing the file path to the output image that has been blurred.
    '''
    import cv2
    import os

    # Read the image from the given path
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError('The image could not be loaded. Please check the file path.')

    # Apply Gaussian blur to the image
    blurred_image = cv2.GaussianBlur(image, (kernel_size, kernel_size), 0)

    # Create the output file path
    base, ext = os.path.splitext(image_path)
    output_image_path = f"{base}_blurred{ext}"

    # Save the blurred image to the output path
    cv2.imwrite(output_image_path, blurred_image)

    return {'blurred_image_path': output_image_path}

def generate_fake_image():
    import numpy as np
    import cv2

    # Create a 100x100 pixel image with 3 color channels (R, G, B)
    fake_image = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)
    fake_image_path = 'fake_image.png'
    cv2.imwrite(fake_image_path, fake_image)
    return fake_image_path

def test_compute():
    # Import necessary modules
    import os

    # Generate a fake image for testing
    image_path = generate_fake_image()
    kernel_size = 3  # An odd integer for the kernel size

    # Call the compute function
    result = compute(image_path, kernel_size)

    # Check the output
    blurred_image_path = result['blurred_image_path']

    # Assert if output image exists
    assert os.path.exists(blurred_image_path), "The blurred image file was not created."

    # Clean up created image files
    os.remove(image_path)
    os.remove(blurred_image_path)
