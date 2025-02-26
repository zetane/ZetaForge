import json
import uuid

def sanitize_unicode(text):
    """Sanitizes text by removing invalid Unicode characters and surrogate pairs."""
    if isinstance(text, str):
        return text.encode('utf-16', 'surrogatepass').decode('utf-16', 'ignore')
    return text

def compute(result_url, result_extracted_content, final_result):
    """Generates an HTML file that displays multiple results lists, merging them into one list."""
    
    merged_results = []
    for results_list in [result_url, result_extracted_content, final_result]:
        if isinstance(results_list, list):
            merged_results.extend(results_list)

    sanitized_results = [sanitize_unicode(item) for item in merged_results]
    json_results = json.dumps(sanitized_results, ensure_ascii=False)  # Correctly serialize JSON
    
    html_template = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Results Gallery</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href='https://fonts.googleapis.com/css?family=Roboto' rel='stylesheet'>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js"></script>
    <style>
        body {{
            margin: 30px;
            font-size: 16px;
            font-family: 'Roboto', sans-serif;
        }}
        .result-item {{
            margin: 10px;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            background-color: #f8f8f8;
            white-space: pre-wrap;
            overflow-wrap: break-word;
        }}
        a {{
            color: #007bff;
            text-decoration: none;
        }}
        a:hover {{
            text-decoration: underline;
        }}
    </style>
</head>
<body>
    <h2>Results List</h2>
    <div id="results_gallery" class="gallery"></div>
    
    <script>
        let results = {json.dumps(sanitized_results, ensure_ascii=False)};

        function escapeHtml(text) {{
            return text.replace(/&/g, '&amp;')
                       .replace(/</g, '&lt;')
                       .replace(/>/g, '&gt;')
                       .replace(/"/g, '&quot;')
                       .replace(/'/g, '&#039;');
        }}

        function formatTextAsHTML(item) {{
            if (typeof item === 'string') {{
                if (item.startsWith("http://") || item.startsWith("https://")) {{
                    return '<a href="' + escapeHtml(item) + '" target="_blank">' + escapeHtml(item) + '</a>';
                }}
                return escapeHtml(item).replace(/\\n/g, '<br>');
            }}
            return escapeHtml(JSON.stringify(item, null, 4)).replace(/\\n/g, '<br>');
        }}

        document.addEventListener("DOMContentLoaded", function() {{
            const resultsGallery = document.getElementById("results_gallery");
            resultsGallery.innerHTML = results.map(item => 
                `<div class="result-item">${{formatTextAsHTML(item)}}</div>`
            ).join('');
        }});
    </script>
</body>
</html>
    """

    unique_id = str(uuid.uuid4())
    html_path = f"results_viz_{unique_id}.html"
    with open(html_path, "w", encoding="utf-8") as file:
        file.write(html_template)

    return {"html": html_path}

def test():
    test_cases = [
        (["Result A", "Result B"], [], []),
        ([], ["Outcome 1", "Outcome 2"], []),
        ([], [], [{"score": 90}, {"score": 80}]),
        ([], [], [])
    ]

    for i, case in enumerate(test_cases):
        result = compute(*case)
        print(f"Test case {i+1}: Input - {case}")
        print(f"Result: {result}\n")
