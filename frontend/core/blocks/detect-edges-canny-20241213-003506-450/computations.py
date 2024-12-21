
def compute(image_path, low_threshold, high_threshold):
    '''
    Detects edges in a given image using the Canny edge detection algorithm.

    This function takes an input image and applies the Canny edge detection algorithm to it.
    The Canny algorithm is a multi-stage process that includes noise reduction, gradient calculation,
    non-maximum suppression, and edge tracking by hysteresis. The output is an image highlighting
    the edges detected in the input image.

    Inputs:
    - image_path: The file path to the input image on which edge detection will be performed.
    - low_threshold: The lower threshold for the hysteresis procedure in the Canny algorithm.
    - high_threshold: The upper threshold for the hysteresis procedure in the Canny algorithm.

    Outputs:
    - edges_image_path: The file path to the output image that contains the edges detected in the input image.
    '''
    import cv2
    import os

    # Read the input image
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise ValueError('The image could not be read. Please check the file path.')

    # Apply Canny edge detection
    edges = cv2.Canny(image, low_threshold, high_threshold)

    # Define the output path
    base, ext = os.path.splitext(image_path)
    edges_image_path = f"{base}_edges{ext}"

    # Save the result
    cv2.imwrite(edges_image_path, edges)

    return {'edges_image_path': edges_image_path}


def generate_fake_image_path():
    import cv2
    import numpy as np
    import tempfile

    # Create a fake image (100x100 pixels, single channel)
    fake_image = np.random.randint(0, 256, (100, 100), dtype=np.uint8)

    # Create a temporary file to save the fake image
    temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    fake_image_path = temp_file.name
    cv2.imwrite(fake_image_path, fake_image)
    temp_file.close()

    return fake_image_path


def test_compute():
    import os

    image_path = generate_fake_image_path()
    low_threshold = 50
    high_threshold = 150

    output = compute(image_path, low_threshold, high_threshold)
    print(output)

    # Cleanup: Remove the generated files
    os.remove(image_path)
    os.remove(output['edges_image_path'])
