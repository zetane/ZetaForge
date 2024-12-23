
def compute(image_path, object_coordinates):
    '''
    Draws a rectangle around a specified object in an image.

    Parameters:
    image_path (str): The path to the image file in which the rectangle will be drawn.
    object_coordinates (dict): A dictionary containing the coordinates of the object. The dictionary should have keys 'x', 'y', 'width', and 'height', representing the top-left corner and dimensions of the rectangle.

    Returns:
    dict: A dictionary with the key 'output_image_path' and the value being the path to the output image file with the rectangle drawn around the specified object.
    '''
    import cv2
    import os

    # Load the image
    image = cv2.imread(image_path)

    # Extract coordinates and dimensions from the dictionary
    x = int(object_coordinates['x'])
    y = int(object_coordinates['y'])
    width = int(object_coordinates['width'])
    height = int(object_coordinates['height'])

    # Define the top-left and bottom-right points of the rectangle
    top_left = (x, y)
    bottom_right = (x + width, y + height)

    # Draw the rectangle on the image
    color = (0, 255, 0)  # Green color in BGR
    thickness = 2  # Thickness of the rectangle border
    cv2.rectangle(image, top_left, bottom_right, color, thickness)

    # Define the output image path
    output_image_path = os.path.splitext(image_path)[0] + '_with_rectangle.jpg'

    # Save the modified image
    cv2.imwrite(output_image_path, image)

    return {'output_image_path': output_image_path}

def generate_test_image():
    import numpy as np
    import cv2
    # Create a 100x100 black image
    image = np.zeros((100, 100, 3), dtype=np.uint8)
    test_image_path = 'test_image.jpg'
    cv2.imwrite(test_image_path, image)
    return test_image_path

def generate_test_coordinates():
    return {'x': 10, 'y': 10, 'width': 30, 'height': 30}

def test_compute():
    image_path = generate_test_image()
    object_coordinates = generate_test_coordinates()
    result = compute(image_path, object_coordinates)
    print(result)
