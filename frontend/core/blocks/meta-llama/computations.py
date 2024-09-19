import transformers
import torch
from huggingface_hub import login


def compute(hf_token, model_id, prompt):
    """
    meta-llama
    """
    # Login with your Hugging Face token and save it to the Git credentials helper
    login(token=hf_token, add_to_git_credential=True)
    pipeline = transformers.pipeline(
        "text-generation", model=model_id, model_kwargs={"torch_dtype": torch.bfloat16}, device="cuda"
    )
    output = pipeline(prompt)

    return {"llama": output}


def test():
    """Test the compute function."""

    print("Running test")
