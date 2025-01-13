import openai
from pydub import AudioSegment
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
    
    # Remove the temporary converted audio file
    os.remove(converted_audio_path)
    
    return transcription["text"]

def compute(audio_path, openai_api_key):
    """Converts audio to text using OpenAI Whisper.

    Inputs:
        audio_path (str): The path to the audio file to be processed.
        openai_api_key (str): The OpenAI API key for accessing Whisper.

    Outputs:
        result (dict): A dictionary containing the transcribed text.
    """
    transcripted_text = []
    # Step 1: Transcribe audio to text
    transcription_text = transcribe_audio(audio_path, openai_api_key)
    print(f"Transcribed Text: {transcription_text}")
    transcripted_text.append(transcription_text)
    # Return the transcription result
    return {"result": transcripted_text}

def test():
    """Test the compute function."""

    print("Running test")
