import openai
from pydub import AudioSegment
import requests
import os

def transcribe_audio(audio_path, openai_api_key):
    """Transcribes audio to text using OpenAI Whisper."""
    # Set the OpenAI API key
    openai.api_key = openai_api_key

    # Convert audio to a standard format if necessary
    audio = AudioSegment.from_file(audio_path).set_frame_rate(16000).set_channels(1)
    converted_audio_path = "converted_audio.wav"
    audio.export(converted_audio_path, format="wav")
    
    # Read the converted audio file
    with open(converted_audio_path, "rb") as audio_file:
        transcription = openai.Audio.transcribe("whisper-1", audio_file)
    return transcription["text"]

def generate_image_from_text(text, output_image_path, openai_api_key):
    """Generates an image from text using OpenAI DALL-E."""
    # Set the OpenAI API key
    openai.api_key = openai_api_key

    # Generate an image from the transcribed text
    response = openai.Image.create(
        prompt=text,
        n=1,
        size="1024x1024"
    )
    
    # Save the generated image
    image_url = response["data"][0]["url"]
    image_data = requests.get(image_url).content
    with open(output_image_path, "wb") as handler:
        handler.write(image_data)
    print(f"Image saved to {output_image_path}")

def compute(audio_path, openai_api_key):
    """Converts audio to text and generates an image from the transcription.

    Inputs:
        audio_path (str): The path to the audio file to be processed.
        openai_api_key (str): The OpenAI API key for accessing Whisper and DALL-E.

    Outputs:
        result (dict): A dictionary containing the path of the generated image.
    """
    result = []
    # Step 1: Transcribe audio to text
    transcription_text = transcribe_audio(audio_path, openai_api_key)
    print(f"Transcribed Text: {transcription_text}")
    
    # Step 2: Generate an image from transcription
    output_image_path = "output_image.png"
    generate_image_from_text(transcription_text, output_image_path, openai_api_key)

    # Create output directory if it doesn't exist
    output_dir = 'output'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Move the image to the output directory
    final_image_path = os.path.join(output_dir, output_image_path)
    os.rename(output_image_path, final_image_path)

    # Return the result
    result.append(final_image_path)
    # result = {"result": [final_image_path]}

    return {"result": result}


def test():
    """Test the compute function."""

    print("Running test")
