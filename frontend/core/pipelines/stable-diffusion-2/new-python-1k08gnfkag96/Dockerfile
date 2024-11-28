FROM python:3.9

WORKDIR /app

RUN pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
RUN pip install diffusers transformers accelerate scipy safetensors

COPY computations.py .
