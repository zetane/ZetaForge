def compute(prompt, inference_steps):
    """
    Pipeline to generate images based on text description
    it takes description and inference steps as an input and provide the result image
    
    prompt: text description of image
    inference_steps: difussion steps

    output: generated image path

    use GPU to run this pipeline, we are using float16 dtype
    """
    from diffusers import StableDiffusionPipeline, EulerDiscreteScheduler
    import torch 
    model_id = "stabilityai/stable-diffusion-2"
    
    # Use the Euler scheduler here instead
    scheduler = EulerDiscreteScheduler.from_pretrained(model_id, subfolder="scheduler")
    pipe = StableDiffusionPipeline.from_pretrained(model_id, scheduler=scheduler, torch_dtype=torch.float16)
    pipe = pipe.to("cuda")
    
    image = pipe(prompt, num_inference_steps=inference_steps).images[0]
        
    image.save("result.png")

    return {"generated_image_path": "result.png"}


def test():
    """Test the compute function."""

    print("Running test")
