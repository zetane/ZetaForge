from zetaforge import block_maker



def Custom(a, b):
    import requests
    import boto3
    import cv2
    import zetaforge
    import numpy as np
    result = a + b
    # a = np.arange(15).reshape(3, 5)
    result2 = a - b
    my_list = ['hello', 1, 3]
    return result, result2, my_list[0]

package_names = "numpy pandas requests json"

block_maker(Custom)