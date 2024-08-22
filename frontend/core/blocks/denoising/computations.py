import os
import torch
from torchvision import transforms
from torch.utils.data import Dataset
from PIL import Image
import numpy as np
import torch.nn as nn

class DenoisingAutoencoder(nn.Module):
    """
    A Convolutional Autoencoder model for image denoising.

    The model consists of an encoder-decoder architecture with convolutional layers.
    The encoder compresses the input image into a lower-dimensional representation, and the decoder reconstructs the image from this representation.
    """
    def __init__(self):
        super(DenoisingAutoencoder, self).__init__()
        self.encoder = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=3, stride=1, padding=1),
            nn.ReLU(),
            nn.Conv2d(64, 32, kernel_size=3, stride=1, padding=1),
            nn.ReLU(),
            nn.Conv2d(32, 16, kernel_size=3, stride=1, padding=1),
            nn.ReLU()
        )
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(16, 32, kernel_size=3, stride=1, padding=1),
            nn.ReLU(),
            nn.ConvTranspose2d(32, 64, kernel_size=3, stride=1, padding=1),
            nn.ReLU(),
            nn.ConvTranspose2d(64, 3, kernel_size=3, stride=1, padding=1),
            nn.Sigmoid()
        )

    def forward(self, x):
        """
        Forward pass through the autoencoder.

        Args:
            x (torch.Tensor): Input image tensor with shape (batch_size, channels, height, width).

        Returns:
            torch.Tensor: Reconstructed image tensor with the same shape as input.
        """
        x = self.encoder(x)
        x = self.decoder(x)
        return x

class DIV2KDataset(Dataset):
    """
    Custom dataset for loading and augmenting the DIV2K image dataset.

    This dataset adds random noise to images to create noisy input data, which is used to train a denoising autoencoder.

    Args:
        root_dir (str): Directory containing the DIV2K images.
        transform (callable, optional): A function/transform to apply to the images.
        noise_factor (float, optional): Factor to determine the level of noise added to the images.
    """
    def __init__(self, root_dir, transform=None, noise_factor=0.3):
        self.root_dir = root_dir
        self.transform = transform
        self.noise_factor = noise_factor
        self.image_paths = [os.path.join(root_dir, f) for f in os.listdir(root_dir) if os.path.isfile(os.path.join(root_dir, f))]

    def __len__(self):
        """
        Returns the total number of images in the dataset.

        Returns:
            int: Number of images.
        """
        return len(self.image_paths)

    def __getitem__(self, idx):
        """
        Loads an image and applies transformations and noise.

        Args:
            idx (int): Index of the image to retrieve.

        Returns:
            tuple: A tuple containing the noisy image tensor and the original clean image tensor.
        """
        img_path = self.image_paths[idx]
        image = Image.open(img_path).convert('RGB')
        if self.transform:
            image = self.transform(image)
        noisy_image = image + self.noise_factor * torch.randn(image.size())
        noisy_image = torch.clip(noisy_image, 0., 1.)
        return noisy_image, image

# Load the model
model = DenoisingAutoencoder()
model_path = 'denoising_autoencoder_DIV2K.pt'

if not os.path.exists(model_path):
    raise FileNotFoundError(f"The model file {model_path} does not exist.")
model.load_state_dict(torch.load(model_path))

# Transformations for the input data
transform = transforms.Compose([
    transforms.Resize((128, 128)),  # Resize for quicker training
    transforms.ToTensor()
])

def denoise_image(model, noisy_image_tensor):
    """
    Denoise the image using the pre-trained model.

    Args:
        model (nn.Module): The pre-trained denoising autoencoder model.
        noisy_image_tensor (torch.Tensor): The tensor representing the noisy image.

    Returns:
        torch.Tensor: The tensor representing the denoised image.
    """
    model.eval()
    with torch.no_grad():
        output = model(noisy_image_tensor.unsqueeze(0))
    return output.squeeze()

def compute(image_path):
    """
    Perform denoising on the given image and save the results.

    This function loads an image, adds noise, applies the denoising model, and saves both noisy and denoised images.

    Args:
        image_path (str): Path to the noisy image file.

    Returns:
        dict: Dictionary containing paths to the input (noisy) and output (denoised) images.
    """
    result = []
    input_result = []

    noise_factor = 0.3

    # Load and transform the image
    image = Image.open(image_path).convert('RGB')
    image_tensor = transform(image)

    # Add noise to the image
    noisy_image_tensor = image_tensor + noise_factor * torch.randn(image_tensor.size())
    noisy_image_tensor = torch.clip(noisy_image_tensor, 0., 1.)
    noisy_image = Image.fromarray((noisy_image_tensor.permute(1, 2, 0).numpy() * 255).astype(np.uint8))

    # Denoise the image
    denoised_image_tensor = denoise_image(model, noisy_image_tensor)
    denoised_image = Image.fromarray((denoised_image_tensor.permute(1, 2, 0).numpy() * 255).astype(np.uint8))

    # Create output and input directories if they don't exist
    output_dir = 'output'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    input_dir = 'input'
    if not os.path.exists(input_dir):
        os.makedirs(input_dir)

    # Save the noisy image in the input directory
    input_image_name = os.path.basename(image_path)
    input_save_path = os.path.join(input_dir, f"noisy_{input_image_name}")
    noisy_image.save(input_save_path)

    # Save the denoised image in the output directory
    output_image_name = f"denoised_{input_image_name}"
    output_save_path = os.path.join(output_dir, output_image_name)
    denoised_image.save(output_save_path)

    result.append(output_save_path)
    input_result.append(input_save_path)

    return {"result": result, "input_result": input_result}

def test():
    """Test the compute function."""

    print("Running test")
