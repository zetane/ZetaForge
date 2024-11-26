import os

def compute():
    '''List all image files in the current directory, rename them by appending 'img_' in front, and save them with the same name. Return the filenames of the renamed files.'''

    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']
    renamed_image_files = []

    current_directory = os.path.dirname(os.path.abspath(__file__))
    for file in os.listdir(current_directory):
        if any(file.lower().endswith(ext) for ext in image_extensions):
            new_filename = 'img_' + file
            os.rename(os.path.join(current_directory, file), os.path.join(current_directory, new_filename))
            renamed_image_files.append(new_filename)

    return {'image_files': renamed_image_files}

def test():
    # Test the function without input, assumes known files in the current directory
    expected_output = {'renamed_image_files': ['img_image1.jpg', 'img_photo.png', 'img_pic.gif']}
    result = compute()
    print('Test Passed:', result == expected_output, 'Output:', result)