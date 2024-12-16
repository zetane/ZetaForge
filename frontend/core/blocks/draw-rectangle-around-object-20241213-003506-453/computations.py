def compute(image_path, rectangle_coordinates):
    '''
    Draws a rectangle around a specified object in an image.

    Parameters:
    image_path (str): The file path to the image where the rectangle will be drawn.
    rectangle_coordinates (dict): A dictionary containing the coordinates for the rectangle. The keys are 'x', 'y', 'width', and 'height', representing the top-left corner and the dimensions of the rectangle.

    Returns:
    dict: A dictionary with the key 'modified_image_path' and the value being the file path to the modified image with the rectangle drawn around the object.
    '''
    import cv2
    
    # Load the image
    image = cv2.imread(image_path)
    
    # Extract rectangle coordinates
    x = int(rectangle_coordinates['x'])
    y = int(rectangle_coordinates['y'])
    width = int(rectangle_coordinates['width'])
    height = int(rectangle_coordinates['height'])
    
    # Define the top-left and bottom-right points of the rectangle
    top_left = (x, y)
    bottom_right = (x + width, y + height)
    
    # Draw the rectangle on the image
    color = (0, 255, 0)  # Green color in BGR
    thickness = 2  # Thickness of the rectangle border
    cv2.rectangle(image, top_left, bottom_right, color, thickness)
    
    # Define the output path
    output_image_path = 'modified_image_with_rectangle.jpg'
    
    # Save the modified image
    cv2.imwrite(output_image_path, image)
    
    return {'modified_image_path': output_image_path}

def generate_fake_image():
    import numpy as np
    import cv2
    
    # Create a fake image with random colors
    fake_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    fake_image_path = 'fake_image.jpg'
    cv2.imwrite(fake_image_path, fake_image)
    return fake_image_path

def generate_rectangle_coordinates():
    # Generate a simple rectangle at top-left corner with fixed dimensions
    return {'x': 10, 'y': 10, 'width': 50, 'height': 50}

def test_compute():
    image_path = generate_fake_image()
    rectangle_coordinates = generate_rectangle_coordinates()
    result = compute(image_path, rectangle_coordinates)
    print(result)

