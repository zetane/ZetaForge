from PIL import Image
import cv2
import os


def compute(image_path, range_min, range_max, step):
    print('Computing starting')

    img = Image.open(image_path)
    image_name = os.path.splitext(os.path.basename(image_path))[0]
    print('image_name', image_name)

    image = cv2.imread(image_path)

    path_array = []
    for n in range(range_min,range_max,step):
        # Convert the image to grayscale
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply edge detection using the Canny algorithm
        edges = cv2.Canny(gray_image, 100, n)

        # Save the resulting image with edges
        output_path = "files/edges_image" + image_name +str(n)+".jpg"
        cv2.imwrite(output_path, edges)

        path_array.append(output_path)

    ret = {'image_paths': path_array}
    return ret
