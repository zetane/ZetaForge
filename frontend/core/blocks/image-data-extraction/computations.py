import openai
import easyocr
import os
import csv
import pandas as pd

# Initialize easyocr reader
reader = easyocr.Reader(['en'])

# Extract text from the image using easyocr
def extract_text_from_image(image_path):
    result = reader.readtext(image_path)
    extracted_text = " ".join([text[1] for text in result])  # Combine all detected texts
    return extracted_text

# Call OpenAI API to process the extracted text using the correct API
def analyze_text_with_gpt(extracted_text):
    openai.api_key = os.getenv('OPENAI_API_KEY')  # Use environment variables for API keys

    # ChatGPT prompt for extracting name and company from text
    prompt = f"Extract the name of the person and company from the following text: {extracted_text}. Format the response as 'Person: <person_name>, Company: <company_name>'."

    # Use 'ChatCompletion.create' for chat-based models like GPT-4 or GPT-3.5-turbo
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are an assistant that extracts names and company information from text."},
            {"role": "user", "content": prompt}
        ]
    )

    return response['choices'][0]['message']['content'].strip()

# Parse the GPT response to extract the person's name and company
def parse_gpt_response(gpt_response):
    try:
        person = gpt_response.split("Person: ")[1].split(",")[0].strip()
        company = gpt_response.split("Company: ")[1].strip()
    except (IndexError, AttributeError):
        person, company = "N/A", "N/A"  # In case GPT response format is unexpected
    
    return person, company

# Define the compute function
def compute(folder_path, output_csv):
    """Compute function to extract text from multiple images and save results in a CSV file.

    Inputs:
        folder_path (str): Path to the folder containing images.
        output_csv (str): Name of the output CSV file.

    Outputs:
        dataframe (pd.DataFrame): A dataframe with image name, person, and company details.
    """
    # List all image files in the folder
    image_files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif'))]
    
    # Initialize list to store data for the DataFrame
    data = []

    # Process each image
    for image_file in image_files:
        image_path = os.path.join(folder_path, image_file)
        print(f"Processing image: {image_file}")

        # Step 1: Extract text from image
        extracted_text = extract_text_from_image(image_path)
        
        # Step 2: Analyze the text using GPT
        gpt_response = analyze_text_with_gpt(extracted_text)
        
        # Step 3: Parse GPT response
        person, company = parse_gpt_response(gpt_response)
        
        # Append data to the list
        data.append([image_file, person, company])

    # Create a DataFrame from the data list
    df = pd.DataFrame(data, columns=['Image Name', 'Person', 'Company'])

    # Save the DataFrame to CSV
    df.to_csv(output_csv, index=False, encoding='utf-8')

    # Return the DataFrame
    return {"result": df}



def test():
    """Test the compute function."""

    print("Running test")
