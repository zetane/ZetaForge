import os
from PIL import Image, ImageDraw, ImageFont

def add_watermark(input_image_path, output_image_path, watermark_text, position, transparency=128):
    """
    Adds a watermark to an image.

    Args:
        input_image_path (str): Path to the input image.
        output_image_path (str): Path to save the watermarked image.
        watermark_text (str): The text of the watermark.
        position (str): Position of the watermark ('bottom_right', 'bottom_left', 'top_right', 'top_left', 'center').
        transparency (int): Transparency level of the watermark (0-255).

    Returns:
        Image: The watermarked image.
    """
    # Open the original image
    original = Image.open(input_image_path).convert("RGBA")

    # Make the image editable
    txt = Image.new('RGBA', original.size, (255, 255, 255, 0))

    # Choose a font and size
    font = ImageFont.truetype("arial.ttf", 500)

    # Initialize ImageDraw
    draw = ImageDraw.Draw(txt)

    # Define the position and text
    width, height = original.size
    text_bbox = draw.textbbox((0, 0), watermark_text, font)
    text_width, text_height = text_bbox[2] - text_bbox[0], text_bbox[3] - text_bbox[1]
    
    if position == "bottom_right":
        position = (width - text_width - 10, height - text_height - 10)
    elif position == "bottom_left":
        position = (10, height - text_height - 10)
    elif position == "top_right":
        position = (width - text_width - 10, 10)
    elif position == "top_left":
        position = (10, 10)
    elif position == "center":
        position = ((width - text_width) // 2, (height - text_height) // 2)
    else:
        raise ValueError("Invalid position argument. Choose from 'bottom_right', 'bottom_left', 'top_right', 'top_left', 'center'.")

    # Add text to image
    draw.text(position, watermark_text, fill=(255, 255, 255, transparency), font=font)

    # Combine the original image with the text image
    watermarked = Image.alpha_composite(original, txt)

    # Save the result
    watermarked.save(output_image_path)
    
    return watermarked

def compute(image_path, watermark_text, position):
    """
    Computes the watermark for the given image.

    Args:
        image_path (str): Path to the input image.
        watermark_text (str): The text of the watermark.
        position (str): Position of the watermark on the image ('bottom_right', 'bottom_left', 'top_right', 'top_left', 'center').

    Returns:
        dict: Dictionary containing the path of the watermarked image. The key 'result' holds a list with the path.
    """
    result = []
    output_image_path = "sample_watermarked.png"
    transparency = 200

    # Add watermark to the image
    watermarked_image = add_watermark(
        input_image_path=image_path,
        output_image_path=output_image_path,
        watermark_text=watermark_text,
        position=position,
        transparency=transparency
    )

    # Create output directory if it doesn't exist
    output_dir = 'output'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    output_save_path = os.path.join(output_dir, output_image_path)
    watermarked_image.save(output_save_path)
    result.append(output_save_path)

    return {"result": result}


def test():
    """Test the compute function."""

    print("Running test")

