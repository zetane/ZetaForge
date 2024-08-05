# Use the Python 3.9 base image
FROM python:3.9

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY requirements.txt .

# Install the dependencies specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Update the package list and install FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy the computations.py file into the container
COPY computations.py .

# Specify the default command to run when starting the container
CMD ["python", "computations.py"]
