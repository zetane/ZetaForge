import os
import torch
from torchvision import transforms
from torch.utils.data import DataLoader, Dataset
from PIL import Image
import numpy as np
import matplotlib.pyplot as plt
import torch.nn as nn
import torch.optim as optim

# Super-resolution function
def super_resolve(model, image_path, transform, target_size=(256, 256)):
    """
    Super-resolves an image using the given model.

    Args:
        model (nn.Module): The pre-trained super-resolution model.
        image_path (str): The path to the input image.
        transform (callable): A transformation function to preprocess the image.
        target_size (tuple): The desired output size of the super-resolved image.

    Returns:
        Image: The super-resolved image in RGB format.
    """
    model.eval()
    image = Image.open(image_path).convert('YCbCr')
    y, cb, cr = image.split()
    y = transform(y.resize(target_size)).unsqueeze(0)

    with torch.no_grad():
        sr_y = model(y)

    sr_y = sr_y.squeeze().clamp(0, 1).cpu().numpy()
    sr_y = (sr_y * 255.0).astype(np.uint8)

    # Upsample Cb and Cr to match the size of the super-resolved Y channel
    cb = cb.resize(target_size, Image.BICUBIC)
    cr = cr.resize(target_size, Image.BICUBIC)

    # Merge the channels back
    sr_image_ycbcr = Image.merge('YCbCr', [Image.fromarray(sr_y), cb, cr])
    sr_image_rgb = sr_image_ycbcr.convert('RGB')

    return sr_image_rgb

class SRCNN(nn.Module):
    """
    Super-Resolution Convolutional Neural Network (SRCNN) model.

    The model consists of three convolutional layers with ReLU activation functions.
    It takes a single-channel image as input and produces a single-channel super-resolved image.
    """
    def __init__(self):
        super(SRCNN, self).__init__()
        self.layer1 = nn.Conv2d(1, 64, kernel_size=9, padding=4)
        self.layer2 = nn.Conv2d(64, 32, kernel_size=5, padding=2)
        self.layer3 = nn.Conv2d(32, 1, kernel_size=5, padding=2)
        self.relu = nn.ReLU()

    def forward(self, x):
        """
        Forward pass of the SRCNN model.

        Args:
            x (torch.Tensor): Input image tensor.

        Returns:
            torch.Tensor: Super-resolved image tensor.
        """
        x = self.relu(self.layer1(x))
        x = self.relu(self.layer2(x))
        x = self.layer3(x)
        return x

# Load the model
model = SRCNN()
model_path = 'srcnn.pth'

if not os.path.exists(model_path):
    raise FileNotFoundError(f"The model file {model_path} does not exist.")
model.load_state_dict(torch.load(model_path))

# Transformations for the input data
transform = transforms.Compose([
    transforms.ToTensor(),
])

def compute(image_path):
    """
    Computes the super-resolved image from the given input image.

    Args:
        image_path (str): The path to the input image.

    Returns:
        dict: A dictionary containing paths to the input and super-resolved images.
              Keys are 'result' (path to super-resolved image) and 'input_result' (path to input image).
    """
    result = []
    input_result = []
    sr_image_rgb = super_resolve(model, image_path, transform)

    # Load the input image
    input_image = Image.open(image_path)

    # Create output directory if it doesn't exist
    output_dir = 'output'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Create input directory if it doesn't exist
    input_dir = 'input'
    if not os.path.exists(input_dir):
        os.makedirs(input_dir)

    # Save the input image in the input directory
    input_image_name = os.path.basename(image_path)
    input_save_path = os.path.join(input_dir, input_image_name)
    input_image.save(input_save_path)

    # Save the result using PIL
    image_name = 'super_resolved_image_rgb.png'
    save_path = os.path.join(output_dir, image_name)
    sr_image_rgb.save(save_path)

    result.append(save_path)
    input_result.append(input_save_path)
    return {"result": result, "input_result": input_result}


def test():
    """Test the compute function."""

    print("Running test")

