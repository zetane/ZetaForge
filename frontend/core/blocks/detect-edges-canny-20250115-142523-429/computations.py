
def compute(image_path, low_threshold, high_threshold, output_path):
    '''
    Detects edges in an image using the Canny edge detection algorithm.

    This function applies the Canny edge detection algorithm to an input image.
    The Canny algorithm is a multi-stage process that includes noise reduction,
    gradient calculation, non-maximum suppression, and edge tracking by hysteresis.

    Parameters:
    image_path (str): The file path to the input image on which edge detection will be performed.
    low_threshold (int): The lower threshold for the hysteresis procedure in the Canny algorithm.
    high_threshold (int): The upper threshold for the hysteresis procedure in the Canny algorithm.
    output_path (str): The file path where the output image with detected edges will be saved.

    Returns:
    dict: A dictionary with the key 'edges_image_path' and the value being the path to the output image.
    '''
    import cv2
    import os

    # Read the input image
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise ValueError(f"Image not found at the path: {image_path}")

    # Apply Canny edge detection
    edges = cv2.Canny(image, low_threshold, high_threshold)

    # Save the result to the output path
    cv2.imwrite(output_path, edges)

    return {'edges_image_path': output_path}

def generate_fake_image():
    import numpy as np
    import cv2
    # Create a fake grayscale image (100x100)
    fake_image = np.random.randint(0, 256, (100, 100), dtype=np.uint8)
    fake_image_path = 'fake_image.jpg'
    cv2.imwrite(fake_image_path, fake_image)
    return fake_image_path

def test_compute():
    import os
    # Generate fake input image
    image_path = generate_fake_image()
    low_threshold = 50
    high_threshold = 150
    output_path = 'output_edges.jpg'

    # Call the compute function
    compute(image_path, low_threshold, high_threshold, output_path)
    
    # Check if the output file is created
    assert os.path.exists(output_path)
    
    # Clean up generated files
    os.remove(image_path)
    os.remove(output_path)
