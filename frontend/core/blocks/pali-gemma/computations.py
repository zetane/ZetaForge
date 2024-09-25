import torch
from transformers import AutoProcessor, PaliGemmaForConditionalGeneration
from PIL import Image
from huggingface_hub import login

def compute(hf_token, img_path, prompt):
    """
    Paligamma
    """
    login(token=hf_token, add_to_git_credential=True)
    model_id = "google/paligemma-3b-mix-224"
    model = PaliGemmaForConditionalGeneration.from_pretrained(model_id).to("cuda")  # Load model to GPU
    processor = AutoProcessor.from_pretrained(model_id)
    
    raw_image = Image.open(img_path)
    inputs = processor(prompt, raw_image, return_tensors="pt").to("cuda")  # Move inputs to GPU
    output = model.generate(**inputs, max_new_tokens=20)
    
    PaliGamma = processor.decode(output[0], skip_special_tokens=True)[len(prompt):]
    
    return {"PaliGamma": PaliGamma}



def test():
    """Test the compute function."""

    print("Running test")
