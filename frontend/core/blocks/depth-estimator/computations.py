
def compute(img_path):
    """
    Performs depth estimation on an input image using the Depth-Anything-V2-Small model.

    This function uses the Hugging Face Transformers pipeline to load the 
    'depth-anything/Depth-Anything-V2-Small-hf' model for depth estimation. It processes 
    the input image and generates a depth map, which is then saved as 'depth.jpg'.

    Inputs:
        img_path (str): Path to the input image file.(use file core block)

    Outputs:
        dict: A dictionary containing the following key-value pair:
            'depth' (list): A list containing the filename of the saved depth map ('depth.jpg').

    Requirements:
        - transformers library
        - PIL (Python Imaging Library)
        - 'depth-anything/Depth-Anything-V2-Small-hf' model from Hugging Face

    Example:
        result = compute('path/to/your/image.jpg')
        print(result)  # Output: {'depth': ['depth.jpg']}

    Note:
        The depth map is saved in the current working directory as 'depth.jpg'.
        Ensure you have sufficient disk space and write permissions.
    """

    from transformers import pipeline
    import torch
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    checkpoint = "depth-anything/Depth-Anything-V2-base-hf"
    pipe = pipeline("depth-estimation", model=checkpoint, device=device)

    from PIL import Image
    image = Image.open(img_path)

    depth = pipe(image)["depth"]
    depth.save("depth.jpg")
    
    result = []
    result.append("depth.jpg")
    return {"depth": result}


def test():
    """Test the compute function."""

    print("Running test")
