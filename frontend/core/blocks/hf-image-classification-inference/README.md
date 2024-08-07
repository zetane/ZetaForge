# block-hf-image-classification-inference

A block that runs image classification inference using dataset and model pairs on Hugging Face.

This block can be used in ZetaForge, an open-source platform enabling developers to design, build, and deploy AI pipelines quickly. Check out ZetaForge on GitHub: https://github.com/zetane/zetaforge.

This block takes in four parameters:
1) `dataset_name`: Name of the dataset on Hugging Face.
2) `split_name`: The dataset split to run the inference on.
3) `model_name`: Name of the model on Hugging Face.
4) `n_samples`: Number of samples to run inference.

And returns the following as output:
1) `images`: List of paths to images that were used for inference.
2) `predictions`: List of prediction labels for each inference image.

To use this block for a dataset and model pair on Hugging Face, browse [https://huggingface.co/datasets](https://huggingface.co/datasets) to find the dataset you want to run inference on and note the dataset name. Then, by referring to the dataset card, find the dataset split you are interested in, e.g., `test`. To choose a model trained on the selected dataset, select a model from the right-hand side menu on the dataset page (Models trained or fine-tuned on `$DATASET_NAME$`...). Note that this block is only designed for dataset and model pairs that support the image classification task. Please refer to the image below to learn more about how to use Hugging Face to find a dataset and model pair: 

![huggingface-guide](https://github.com/zetane/block-hf-image-classification-inference/assets/97202788/60f327bb-6989-4065-bce2-6dd0ccf67f12)

To view the output, you can connect this block to the View Images core block, or create your own image viewer block that supports captions as well to visualize both the images and the predictions, like the example screenshot below:
![hf-image-classification-example](https://github.com/zetane/block-hf-image-classification-inference/assets/97202788/337b78f0-235a-4e1e-8d8b-e94a230fbeea)
