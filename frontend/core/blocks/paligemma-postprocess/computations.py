import json
import uuid
from PIL import Image, ImageDraw
import matplotlib.pyplot as plt
import numpy as np
import base64
from io import BytesIO

def draw_bounding_boxes(image, boxes, labels):
    """Draw bounding boxes on the image."""
    draw = ImageDraw.Draw(image)
    for box, label in zip(boxes, labels):
        y_min, x_min, y_max, x_max = box
        draw.rectangle([x_min, y_min, x_max, y_max], outline="red", width=2)
        draw.text((x_min, y_min), label, fill="white")
    return image

def image_to_base64(image):
    """Convert PIL image to base64 string."""
    buffered = BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def parse_detection_output(output):
    """Parse detection output and extract bounding box coordinates and labels."""
    boxes = []
    labels = []
    
    # Split the output by entities (each entity ends with a label and may contain coordinates)
    entities = output.strip().split(";")
    
    for entity in entities:
        loc_tokens = [token for token in entity.split("<") if token.startswith("loc")]
        label = entity.split()[-1].strip()  # The label is the last word in the entity
        print(loc_tokens, label)
        if len(loc_tokens) == 4:
            # Clean the tokens by removing '>' and separating out the label from the coordinates
            try:
                y_min = float(loc_tokens[0][3:].replace(">", "")) / 1024
                x_min = float(loc_tokens[1][3:].replace(">", "")) / 1024
                y_max = float(loc_tokens[2][3:].replace(">", "")) / 1024
                # Ensure the last loc_token doesn't include the label
                x_max = float(loc_tokens[3][3:].split(">")[0]) / 1024  # Splitting at '>' to isolate the number
                boxes.append([y_min, x_min, y_max, x_max])
                labels.append(label)
            except ValueError as e:
                print(f"Error parsing coordinates: {e}")
    print(boxes, labels)
    return boxes, labels

def parse_segmentation_output(output):
    """Parse segmentation output and extract segmentation mask."""
    # Extract segmentation tokens, removing the trailing '>' character
    seg_tokens = [token for token in output.split("<") if token.startswith("seg")]
    
    # Remove '>' and convert segmentation values to float
    segmentation_values = []
    for token in seg_tokens:
        try:
            # Remove the trailing '>' character and convert to float
            segmentation_value = float(token[3:].replace(">", ""))
            segmentation_values.append(segmentation_value)
        except ValueError as e:
            print(f"Error converting token '{token}' to float: {e}")
            continue

    # Assuming the segmentation mask is 1024x1024 for simplicity
    mask_size = 1024
    segmentation_mask = np.zeros((mask_size, mask_size))

    # Populate the segmentation mask with values
    for i, value in enumerate(segmentation_values):
        row = i // mask_size
        col = i % mask_size
        segmentation_mask[row, col] = value / 255  # Normalize to [0, 1] for visualization

    return segmentation_mask


    
def compute(img_path, prompt, output):
    """
    Process the image for detection and segmentation using PaliGemma.
    """
    
    # Open image
    raw_image = Image.open(img_path)
    w, h = raw_image.size
    
    # Initialize detection-related variables
    boxes = []
    labels = []
    detected_image = raw_image.copy() 
    if "detect" in prompt.lower():
        # Parse detection output
        boxes, labels = parse_detection_output(output)
        
        # Convert normalized coordinates back to actual image coordinates
        boxes = [[y_min * h, x_min * w, y_max * h, x_max * w] for (y_min, x_min, y_max, x_max) in boxes]
        
        # Draw bounding boxes on the image
        if boxes:
            detected_image = draw_bounding_boxes(raw_image.copy(), boxes, labels)
    
    if "segment" in prompt.lower():
        # Parse segmentation output
        segmentation_mask = parse_segmentation_output(output)
        
        # Overlay the segmentation mask on the original image (for visualization)
        fig, ax = plt.subplots()
        ax.imshow(np.array(raw_image))
        ax.imshow(segmentation_mask, cmap="gray", alpha=0.5)
        ax.set_title("Segmentation Mask")
        ax.axis("off")
        
        # Save the figure to a BytesIO object
        buf = BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0)
        plt.close(fig)
        buf.seek(0)
        
        # Convert to PIL Image
        processed_image = Image.open(buf)
    else:
        processed_image = detected_image
    
    # Convert the processed image to base64
    processed_image_base64 = image_to_base64(processed_image)
    
    # Generate HTML output
    html_template = f"""
<html>
<head>
    <title>Paligamma</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap" rel="stylesheet">
    <style>
        body {{
            font-family: 'Roboto', sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #74ebd5 0%, #ACB6E5 100%);
            color: #333;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }}
        .container {{
            background-color: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 900px;
            margin: auto;
        }}
        h1 {{
            font-size: 36px;
            color: #333;
            margin-bottom: 20px;
        }}
        h2 {{
            font-size: 28px;
            color: #555;
            margin-top: 30px;
        }}
        p {{
            font-size: 18px;
            line-height: 1.6;
            color: #666;
        }}
        img {{
            max-width: 900px;
            max-height: 900px;
            border-radius: 10px;
            margin-top: 20px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>PaliGamma Output</h1>
        <p>{output}</p>
        <h2>Processed Image</h2>
        <img src="data:image/png;base64,{processed_image_base64}" alt="Processed Image"/>
    </div>
</body>
</html>
"""

    unique_id = str(uuid.uuid4())
    html_path = f"/files/data_viz_{unique_id}.html"
    #data_view_str = json.dumps(data_view, indent=4)  # Properly escape JSON for embedding in JavaScript
    html_code = html_template #.replace("$data_paths", json.dumps(data_view))

    # Write the file
    with open(html_path, "w") as file:
        file.write(html_code)

    return {"html": f"data_viz_{unique_id}.html"}

def test():
    """Test the compute function with various data types and print the test cases and their results."""
    test_cases = [
        "Single string\nwith newline",
        ["List", "of\nstrings"],
        {"name": "Alice", "age": 30},
        [{"name": "Bob", "age": 25}, {"name": "Charlie", "age": 35}],
        json.dumps({"name": "Dave", "age": 40}),
        [json.dumps({"name": "Eve", "age": 45}), json.dumps({"name": "Frank", "age": 50})]
    ]

    for i, case in enumerate(test_cases):
        result = compute(case)
        print(f"Test case {i+1}: Input - {case}")
        print(f"Result: {result}\n")
