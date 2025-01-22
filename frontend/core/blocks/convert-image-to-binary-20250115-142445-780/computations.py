
def compute(image_path, threshold):
    '''
    Convert a grayscale image to a binary image using a specified threshold.

    Parameters:
    image_path (str): The file path to the grayscale image that needs to be converted to binary.
    threshold (int): The threshold value used to convert the grayscale image to binary. Pixel values greater than or equal to this threshold will be set to white, otherwise black.

    Returns:
    dict: A dictionary with the key 'binary_image_path' and the value being the file path to the resulting binary image after conversion.
    '''
    import cv2
    import os

    # Read the grayscale image
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    
    # Check if image is loaded
    if image is None:
        raise ValueError('Image not found or unable to load.')

    # Convert the image to binary using the threshold
    _, binary_image = cv2.threshold(image, threshold, 255, cv2.THRESH_BINARY)

    # Create the output file path
    base, ext = os.path.splitext(image_path)
    binary_image_path = f"{base}_binary{ext}"

    # Save the binary image
    cv2.imwrite(binary_image_path, binary_image)

    return {'binary_image_path': binary_image_path}

def generate_fake_image():
    import numpy as np
    import cv2
    
    # Create a 10x10 grayscale image with random values
    fake_image = np.random.randint(0, 256, (10, 10), dtype=np.uint8)
    
    # Save it to a temporary location
    fake_image_path = 'fake_image.png'
    cv2.imwrite(fake_image_path, fake_image)
    return fake_image_path


def test_compute():
    image_path = generate_fake_image()
    threshold = 128
    result = compute(image_path, threshold)
    print(result)  # To verify the output
