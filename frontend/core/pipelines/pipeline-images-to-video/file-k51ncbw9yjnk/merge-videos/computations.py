from moviepy.editor import VideoFileClip, clips_array

def compute(video1_path, video2_path):
    """
    This function takes two video file paths and creates a new mp4 video with the videos side by side.
    
    Inputs:
        video1_path (str): The file path of the first video
        video2_path (str): The file path of the second video

    Outputs:
        output_path (str): The file path of the output video

    Required Libraries:
        moviepy==1.0.3
    """
    
    # Load video clips
    clip1 = VideoFileClip(video1_path)
    clip2 = VideoFileClip(video2_path)

    # Merge clips side by side
    final_clip = clips_array([[clip1, clip2]])

    # Output filepath
    output_path = "merged-videos.mp4"

    # Write the result to a file
    final_clip.write_videofile(output_path)

    return {"output_path": output_path}

def test():
    """Test the compute function."""
    print("Running test")

    output = compute("path_to_video1.mp4", "path_to_video2.mp4")
    print("Output:", output)