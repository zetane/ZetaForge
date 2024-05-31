from zetaforge.zetahelper import block_maker


def my_function(a, b, c):
    import boto3
    import pandas as pd
    my_list = [a, b, c]
    return a, b, c, my_list

packages = "numpy requests"
block_maker(my_function, packages, name="My Custom Block", description="Test Package")
block_maker(my_function)