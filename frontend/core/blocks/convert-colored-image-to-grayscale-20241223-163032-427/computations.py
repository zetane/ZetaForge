
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
    import numpy as np
    import cv2
    import os
    
    # Create a fake color image using numpy (e.g., 100x100 pixels with 3 color channels)
    fake_image = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)
    
    # Define the file path where this fake image will be saved
    fake_image_path = "fake_image.jpg"
    
    # Save the generated fake image to the file path
    cv2.imwrite(fake_image_path, fake_image)
    
    return fake_image_path


def test_compute():
    # Retrieve the generated fake image path
    image_path = generate_fake_image_path()
    
    # Run the compute function with the fake image path
    result = compute(image_path)
    
    # Print the result to verify that the function ran successfully
    print(result)
