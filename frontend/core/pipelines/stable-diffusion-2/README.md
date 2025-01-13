# Stable Diffusion Image Generation Pipeline

This repository contains a Python function `compute` to generate images based on textual descriptions using the Stable Diffusion model. The function utilizes the `diffusers` library and GPU acceleration for efficient image generation.

## Features

- Generate high-quality images from textual prompts.
- Supports inference using the Euler Discrete Scheduler for diffusion.
- Utilizes GPU acceleration with `float16` for enhanced performance.

---

## Usage
The compute function accepts a textual description (prompt) and the number of inference steps to generate an image. The generated image is saved as result.png in the current working directory.

## Function Parameters
- prompt (str): Text description of the desired image.
- inference_steps (int): Number of diffusion steps for the generation process.
- Return Value:
The function returns a dictionary containing the path to the generated image:

## Model used
- https://huggingface.co/stabilityai/stable-diffusion-2
