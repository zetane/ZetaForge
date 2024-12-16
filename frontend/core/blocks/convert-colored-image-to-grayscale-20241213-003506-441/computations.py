
def compute(image_path):
    '''
    Convert a colored image to a grayscale image.

    This function takes the path to a colored image file as input and converts it to a grayscale image.
    The output is the path to the resulting grayscale image file. The grayscale image will have shades of gray,
    where each pixel represents the intensity of light, with black being the weakest intensity and white being the strongest.

    Parameters:
    image_path (str): The file path to the colored image that needs to be converted to grayscale.

    Returns:
    dict: A dictionary with the key 'grayscale_image_path' and the value being the file path to the resulting grayscale image.
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

def create_fake_image_file():
    import cv2
    import numpy as np
    import tempfile

    # Create a colored image (3 channels) with random colors
    random_colored_image = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)

    # Save the image to a temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
    cv2.imwrite(temp_file.name, random_colored_image)
    return temp_file.name

def test_compute():
    # Create a fake image file for test
    fake_image_path = create_fake_image_file()
    
    # Call the compute function with the fake image path
    grayscale_info = compute(fake_image_path)
    
    # Print the result dictionary
    print(grayscale_info)
