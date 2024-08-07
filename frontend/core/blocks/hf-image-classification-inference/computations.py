from transformers import pipeline
from datasets import load_dataset


def run_inference(dataset, pipe, n_samples):
    predictions = []
    images = []
    for index, example in enumerate(dataset):
        if index >= n_samples:
            break
        if "img" in example.keys():
            image = example["img"]
        elif "image" in example.keys():
            image = example["image"]
        else:
            raise Exception("Could not find the image instance in the dataset dictionary keys.")

        image_path = f"image_{str(index)}.jpg"
        image.save(image_path)
        images.append(image_path)
        prediction = pipe(image)
        predictions.append(prediction[0]['label'])
    return images, predictions


def compute(dataset_name, split_name, model_name, n_samples):
    """
    Runs inference using huggingface pipeline.

    Inputs:
        dataset_name: Name of the huggingface dataset.
        split_name: The dataset split you want to use.
        model_name: Name of the huggingface model.
        n_samples: Number of samples to run inference.

    Outputs:
        images: List of paths to images.
        predictions: Class predictions for the images in the dataset.
    """

    dataset = load_dataset(dataset_name, split=split_name)
    pipe = pipeline('image-classification', model=model_name)

    if n_samples < 1:
        raise Exception("Number of samples should be at least 1.")
    if n_samples > len(dataset):
        print("Number of samples are greater than the dataset size; limiting the number of samples to the dataset size...")
        n_samples = len(dataset)


    images, predictions = run_inference(dataset, pipe, n_samples)

    return {'images': images, 'predictions': predictions}

def test():
    """Test the compute function."""

    print("Running test")
