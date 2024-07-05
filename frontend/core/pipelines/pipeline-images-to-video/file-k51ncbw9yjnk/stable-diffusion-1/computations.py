import requests
import base64
import uuid

def sanitize_prompt(prompt):
    # Remove any surrogate pairs that can cause encoding issues
    sanitized_prompt = prompt.encode('utf-16', 'surrogatepass').decode('utf-16')
    return sanitized_prompt

def generate_img(api_key, prompt, output_img_path):
    api_host = 'https://api.stability.ai'
    engine_id = "stable-diffusion-v3"

    if api_key is None:
        raise Exception("Missing Stability API key.")

    # Sanitize and ensure prompt is properly encoded
    sanitized_prompt = sanitize_prompt(prompt)

    # Multipart form-data
    response = requests.post(
        f"{api_host}/v2beta/stable-image/generate/sd3",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "image/*"
        },
        files={
            "prompt": (None, sanitized_prompt),
            "output_format": (None, "png"),
            "style_preset": (None, "digital-art")
        }
    )

    if response.status_code == 200:
        with open(output_img_path, 'wb') as file:
            file.write(response.content)
    else:
        raise Exception(str(response.json()))

    return output_img_path

def compute(api_key, prompt):
    """
    This block generates images based on a text prompt using Stable Diffusion.
    """
    prompt_ready = f"You will generate an image for the following prompt: {prompt}. The image will be used for a social media post."
    unique_id = str(uuid.uuid4())
    output_img_path = f"sd_generated_image_page_{unique_id}.png"
    sd_output = generate_img(api_key, prompt_ready, output_img_path)

    return {"image_path": sd_output}

def test():
    """Test the compute function."""
    print("Running test")
