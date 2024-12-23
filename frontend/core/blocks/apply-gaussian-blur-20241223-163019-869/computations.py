
def compute(image_path, kernel_size):
    '''
    Applies a Gaussian blur to an image using a specified kernel size.
    
    Parameters:
    image_path (str): The file path to the input image that will be blurred.
    kernel_size (int): The size of the kernel to be used for the Gaussian blur. It must be a positive odd integer.

    Returns:
    dict: A dictionary with the file path to the output image that has been blurred.
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
    # Create a fake image (e.g., 100x100 with 3 channels for RGB)
    fake_image = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)
    # Save the fake image to a temporary file
    path = 'temp_fake_image.jpg'
    cv2.imwrite(path, fake_image)
    return path


def test_compute():
    import os
    # Generate a fake image file path
    image_path = generate_fake_image()
    try:
        # Test the compute function with the generated image and a kernel size
        result = compute(image_path, 3)
        print(f"Test passed. Blurred image saved at: {result['blurred_image_path']}")
    except ValueError as e:
        print(f"Test failed with error: {e}")
    # Clean up generated files after the test
    os.remove(image_path)
    generated_blurred_path = 'temp_fake_image_blurred.jpg'
    if os.path.exists(generated_blurred_path):
        os.remove(generated_blurred_path)
