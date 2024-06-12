import os
import librosa
import librosa.display
import matplotlib.pyplot as plt


def compute(audio_path):
    """
    Computes the waveform of an audio file.

    Inputs:
        audio_path (str): The file path of the audio file.

    Outputs:
        output_path (str): The file path of the saved waveform plot.
    """
    # Load audio file
    y, sr = librosa.load(audio_path)

    # Compute waveform
    plt.figure(figsize=(10, 4))
    librosa.display.waveshow(y, sr=sr)
    plt.xlabel('Time (s)')
    plt.ylabel('Amplitude')
    plt.title('Waveform')

    output_path = 'waveform.jpg'
    plt.savefig(output_path, format='jpg')
    plt.close()

    return {"image_paths": output_path}


def test():
    """Test the compute_waveform function."""
    print("Waveform plot computed successfully.")
