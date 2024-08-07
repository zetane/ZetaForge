from transformers import ViTImageProcessor, ViTForImageClassification
from PIL import Image

def classify(input_img):
    """
    Classifies the input image using the ViT (Vision Transformer) model.

    Args:
        input_img (str): Path to the input image file.

    Returns:
        str: The label of the predicted class.
    """
    image = Image.open(input_img)

    processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224')
    model = ViTForImageClassification.from_pretrained('google/vit-base-patch16-224')

    inputs = processor(images=image, return_tensors="pt")
    outputs = model(**inputs)
    logits = outputs.logits
    # model predicts one of the 1000 ImageNet classes
    predicted_class_idx = logits.argmax(-1).item()
    return model.config.id2label[predicted_class_idx]

def compute(input_img):
    """
    A general purpose classifier. Refer to https://huggingface.co/google/vit-base-patch16-224 for more information about the model.

    Computes the classification of the input image using a Vision Transformer model.

    Args:
        input_img (str): Path to the input image file.

    Returns:
        dict: A dictionary containing the predicted class label.
    """
    prediction = classify(input_img)
    return {"prediction": prediction}


def test():
    """Test the compute function."""

    print("Running test")
