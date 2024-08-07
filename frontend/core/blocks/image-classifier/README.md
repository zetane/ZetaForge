# block-image-classifier
A ZetaForge block for general image classification.

This block can be used in ZetaForge, an open-source platform enabling developers to design, build, and deploy AI pipelines quickly. Check out ZetaForge on GitHub: https://github.com/zetane/zetaforge.

The image classifier block takes in an input image file and classifies that image using a Vision Transformer model pre-trained on ImageNet-21k and fine-tuned on ImageNet 2012. The model card can be found here: [https://huggingface.co/google/vit-base-patch16-224](https://huggingface.co/google/vit-base-patch16-224).

You can connect the image classifier block to an "image viewer with captions" block to see each image with the predicted caption:

![image-classifier-example](https://github.com/zetane/block-image-classifier/assets/97202788/9e2fe4e1-576f-4845-aaf7-e667458fd781)
