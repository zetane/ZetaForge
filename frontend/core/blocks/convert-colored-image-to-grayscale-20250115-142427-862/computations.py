def compute(image_path):
    '''
    Convert a colored image to a grayscale image.

    Parameters:
    image_path (str): The file path to the colored image that needs to be converted to grayscale.

    Returns:
    dict: A dictionary with the key 'grayscale_image_path' and the value as the file path to the resulting grayscale image.
    '''
    import cv2
    import os

    # Read the colored image
    colored_image = cv2.imread(image_path)

    # Convert the image to grayscale
    grayscale_image = cv2.cvtColor(colored_image, cv2.COLOR_BGR2GRAY)

    # Create the output file path
    base, ext = os.path.splitext(image_path)
    grayscale_image_path = f"{base}_grayscale{ext}"

    # Save the grayscale image
    cv2.imwrite(grayscale_image_path, grayscale_image)

    return {'grayscale_image_path': grayscale_image_path}

def generate_fake_image_path():
    import cv2
    import numpy as np
    import os

    # Create a fake image
    fake_image = np.zeros((100, 100, 3), dtype=np.uint8)

    # Define a temporary file path
    temp_image_path = 'temp_colored_image.jpg'

    # Write the fake image to this path
    cv2.imwrite(temp_image_path, fake_image)

    return temp_image_path

def test_compute():
    # Import necessary module
    import os

    # Generate a fake image path
    fake_image_path = generate_fake_image_path()

    # Call the function
    result = compute(fake_image_path)

    # Print the result
    print(result)

    # Remove the temporary images created
    os.remove(fake_image_path)
    os.remove(result['grayscale_image_path'])
