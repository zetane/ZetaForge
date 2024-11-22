import os
import requests
import time



def compute(prompt,api_key):
    """
    Generates an image based on a prompt, waits for the result, and saves it to a specified directory.
    
    Inputs:
        prompt (str): Description for image generation.
        api_key (str): API key for authentication.
    
    Outputs:
        result (dict): Dictionary containing the image URL and saved file path.
    """
    try:
        # Step 1: Send image generation request
        response = requests.post(
            'https://api.bfl.ml/v1/flux-pro-1.1',
            headers={
                'accept': 'application/json',
                'x-key': api_key,
                'Content-Type': 'application/json',
            },
            json={
                'prompt': prompt,
                'width': 1024,
                'height': 768,
            }
        ).json()

        if 'id' not in response:
            raise RuntimeError("Failed to obtain request ID.")
        
        request_id = response['id']
        print(f"Request ID: {request_id}")

        # Step 2: Poll for result
        image_url = None
        while True:
            time.sleep(0.5)
            result = requests.get(
                'https://api.bfl.ml/v1/get_result',
                headers={
                    'accept': 'application/json',
                    'x-key': api_key,
                },
                params={
                    'id': request_id,
                }
            ).json()

            if result['status'] == 'Ready':
                image_url = result['result']['sample']
                print(f"Image URL: {image_url}")
                break
            else:
                print(f"Status: {result['status']}")

        if not image_url:
            raise RuntimeError("Image URL not found.")
        
        destination_directory = '/app/vis_data/vis_image/'
        prompt_list = []
        image_list = []

        # Step 3: Save the image locally in the destination directory
        os.makedirs(destination_directory, exist_ok=True)
        file_name = 'result_image.png'
        saved_image_path = os.path.join(destination_directory, file_name)

        image_list.append(saved_image_path)
        prompt_list.append(prompt)

        image_response = requests.get(image_url, stream=True)
        if image_response.status_code == 200:
            with open(saved_image_path, 'wb') as file:
                for chunk in image_response.iter_content(1024):
                    file.write(chunk)
            print(f"Image saved as '{saved_image_path}'")
        else:
            raise RuntimeError("Failed to download the image.")
        
        return {"saved_image": image_list, "prompt": prompt_list}
    
    except Exception as e:
        raise RuntimeError(f"Error in compute function: {e}")


def test():
    """Test the compute function."""

    print("Running test")
