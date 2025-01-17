
def compute(image_path, coordinates):
    '''
    Draws a rectangle around a specified object in an image.

    Parameters:
    image_path (str): The path to the image file where the rectangle will be drawn.
    coordinates (dict): A dictionary containing the coordinates of the rectangle. Example: {'top_left': {'x': 'int', 'y': 'int'}, 'bottom_right': {'x': 'int', 'y': 'int'}}

    Returns:
    dict: A dictionary with the path to the modified image file with the rectangle drawn around the object.
    '''
    import cv2
    import os

    # Load the image
    image = cv2.imread(image_path)

    # Extract coordinates
    top_left_x = int(coordinates['top_left']['x'])
    top_left_y = int(coordinates['top_left']['y'])
    bottom_right_x = int(coordinates['bottom_right']['x'])
    bottom_right_y = int(coordinates['bottom_right']['y'])

    # Draw the rectangle
    cv2.rectangle(image, (top_left_x, top_left_y), (bottom_right_x, bottom_right_y), (255, 0, 0), 2)

    # Define the output path
    base, ext = os.path.splitext(image_path)
    output_image_path = f"{base}_with_rectangle{ext}"

    # Save the modified image
    cv2.imwrite(output_image_path, image)

    return {'modified_image_path': output_image_path}


def generate_fake_image():
    import numpy as np
    import cv2
    
    # Create a blank image
    image = np.zeros((100, 100, 3), dtype=np.uint8)
    image_path = 'fake_image.jpg'
    cv2.imwrite(image_path, image)
    return image_path


def generate_fake_coordinates():
    return {
        'top_left': {'x': 10, 'y': 10},
        'bottom_right': {'x': 50, 'y': 50}
    }


def test_compute():
    # Generate fake inputs
    image_path = generate_fake_image()
    coordinates = generate_fake_coordinates()

    # Run the compute function
    result = compute(image_path, coordinates)

    print(result)
