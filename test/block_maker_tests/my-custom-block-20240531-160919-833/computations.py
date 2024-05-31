import numpy
import requests

def compute(a, b, c):
    import boto3
    import pandas as pd
    my_list = [a, b, c]

    return {'a': a, 'b': b, 'c': c, 'my-list': my_list}