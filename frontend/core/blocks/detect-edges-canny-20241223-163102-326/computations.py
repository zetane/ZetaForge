
def compute(image_path, low_threshold, high_threshold, sigma):
    '''
    Detects edges in an image using the Canny edge detection algorithm.

    Parameters:
    image_path (str): The file path to the input image on which edge detection will be performed.
    low_threshold (int): The lower threshold for the hysteresis procedure in the Canny edge detection algorithm.
    high_threshold (int): The upper threshold for the hysteresis procedure in the Canny edge detection algorithm.
    sigma (float): The standard deviation of the Gaussian filter used in the noise reduction step of the Canny edge detection algorithm.

    Returns:
    dict: A dictionary containing the file path to the output image with detected edges, a list of coordinates of detected edges, and the total number of edge pixels detected.
    '''
    import cv2
    import numpy as np
    import os

    # Read the image
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise ValueError('Image not found or unable to read the image file.')

    # Apply GaussianBlur to reduce noise
    blurred_image = cv2.GaussianBlur(image, (0, 0), sigma)

    # Perform Canny edge detection
    edges = cv2.Canny(blurred_image, low_threshold, high_threshold)

    # Find coordinates of edge pixels
    edge_coordinates = np.column_stack(np.where(edges > 0))
    edge_coordinates_list = [tuple(coord) for coord in edge_coordinates]

    # Count the number of edge pixels
    edges_count = len(edge_coordinates_list)

    # Save the edges image
    output_image_path = os.path.splitext(image_path)[0] + '_edges.png'
    cv2.imwrite(output_image_path, edges)

    # Prepare the output
    return {
        'edges_image_path': output_image_path,
        'edges_coordinates': edge_coordinates_list,
        'edges_count': str(edges_count)
    }

def generate_fake_image():
    import numpy as np
    import cv2
    # Create a simple black square image
    image = np.zeros((100, 100), dtype=np.uint8) # Grayscale image
    cv2.line(image, (20, 20), (80, 80), (255), 3)  # white diagonal line
    cv2.imwrite('fake_image.png', image)
    return 'fake_image.png'

def test_compute():
    image_path = generate_fake_image()
    low_threshold = 50
    high_threshold = 150
    sigma = 1.0
    
    # Call the compute function
    result = compute(image_path, low_threshold, high_threshold, sigma)
    
    # Print the result for testing
    print(result)
