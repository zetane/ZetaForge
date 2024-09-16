import os
import shutil
from transformers import VisionEncoderDecoderModel, ViTFeatureExtractor, AutoTokenizer
from PIL import Image
import torch

def compute(image_path):
    """
    Processes a list of images, copies them to a destination directory, and generates captions.
    
    Inputs:
        image_path (list): List of image file paths.
    
    Outputs:
        out1 (list): List of paths to the copied images in the destination directory.
        out2 (list): List of captions generated from the images.
    """
    # Ensure the destination directory exists
    destination_directory = '/app/vis_data/vis_image/'
    os.makedirs(destination_directory, exist_ok=True)

    # Load the pre-trained model
    model = VisionEncoderDecoderModel.from_pretrained("nlpconnect/vit-gpt2-image-captioning")
    feature_extractor = ViTFeatureExtractor.from_pretrained("nlpconnect/vit-gpt2-image-captioning")
    tokenizer = AutoTokenizer.from_pretrained("nlpconnect/vit-gpt2-image-captioning")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    # Initialize lists to store image paths and captions
    caption_list = []
    image_list = []
    print("This is image_path:",image_path)
    # Loop through each image, generate captions, copy the image, and store the paths and captions

        # Load and preprocess the image
    img = Image.open(image_path)

    # Create the new image file path in the destination directory
    file_name = os.path.basename(image_path)  # Get the base file name from the original path
    new_image_path = os.path.join(destination_directory, file_name)

    # Copy the image to the destination directory
    shutil.copy(image_path, new_image_path)


    # Save the new image path in the image_list
    image_list.append(new_image_path)

    # Preprocess image for the model
    pixel_values = feature_extractor(images=img, return_tensors="pt").pixel_values
    pixel_values = pixel_values.to(device)

    # Generate the caption (image to text)
    output_ids = model.generate(pixel_values, max_length=16, num_beams=4)
    caption = tokenizer.decode(output_ids[0], skip_special_tokens=True)

    # Save the caption in the caption_list
    caption_list.append(caption)

    # Output the lists as the result of the function
    return {"image_list": image_list, "caption": caption_list}


def test():
    """Test the compute function."""

    print("Running test")
