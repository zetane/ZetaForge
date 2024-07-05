import cv2
import os
import subprocess

def compute(images):
    '''This function takes a list of image filepaths and compiles them into a video file.'''
    video_name = 'my-video.mp4'
    output_video_name = 'my-video-reencoded.mp4'
    
    # Determine the width and height from the first image
    frame = cv2.imread(images[0])
    height, width, layers = frame.shape

    # Choose video speend
    fps = 3
  
    # Define the codec and create VideoWriter object
    fourcc = cv2.VideoWriter_fourcc(*'mp4v') 
    video = cv2.VideoWriter(video_name, fourcc, fps, (width, height))

    for image in images:
        video.write(cv2.imread(image))

    video.release()

    # Re-encode the video to H.264 using FFmpeg
    command = f"ffmpeg -i {video_name} -vcodec h264 -acodec aac {output_video_name}"
    subprocess.run(command, shell=True, check=True)
    
    return {'video_path': output_video_name}

def test():
    '''Test the compute function with a series of image filepaths'''
    images = ['img1.jpg', 'img2.jpg', 'img3.jpg']
    result = compute(images)
    print('Video created successfully at', result['video_path'])
