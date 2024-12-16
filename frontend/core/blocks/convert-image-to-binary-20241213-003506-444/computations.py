
def compute(image_path, threshold):
    '''
    Convert a grayscale image to a binary image using a specified threshold.

    Parameters:
    image_path (str): The file path to the grayscale image that needs to be converted to binary.
    threshold (int): The threshold value used to convert the image to binary. Pixel values above this threshold will be set to 255 (white), and those below will be set to 0 (black).

    Returns:
    dict: A dictionary with the key 'binary_image_path' and the value being the file path to the resulting binary image.
    '''
    import cv2
    import os

    # Read the grayscale image
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    
    # Apply the threshold to convert the image to binary
    _, binary_image = cv2.threshold(image, threshold, 255, cv2.THRESH_BINARY)
    
    # Create the output file path
    base, ext = os.path.splitext(image_path)
    binary_image_path = f"{base}_binary{ext}"
    
    # Save the binary image
    cv2.imwrite(binary_image_path, binary_image)
    
    return {'binary_image_path': binary_image_path}

def generate_fake_image(image_path):
    import cv2
    import numpy as np
    # Create a fake grayscale image with random pixel values
    fake_image = np.random.randint(0, 256, (100, 100), dtype=np.uint8)
    # Save the fake image to the specified path
    cv2.imwrite(image_path, fake_image)

def test_compute():
    import os
    # Generate a fake image for testing
    test_image_path = 'test_grayscale_image.png'
    generate_fake_image(test_image_path)
    # Define a threshold for testing
    threshold = 128
    # Call the compute function
    result = compute(test_image_path, threshold)
    # Print the result
    print(result)
    # Clean up the test files
    os.remove(test_image_path)
    os.remove(result['binary_image_path'])
