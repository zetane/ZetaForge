from transformers import pipeline

def compute(article_text, max_length=150, min_length=50):
    """
    Summarizes the given article text into bullet points and returns the result in a dictionary.

    :param article_text: The text of the article to summarize.
    :param max_length: Maximum length of the summary.
    :param min_length: Minimum length of the summary.
    :return: A dictionary containing the bullet points summary.
    """
    # Ensure max_length and min_length are integers if they are passed as strings
    if isinstance(max_length, str):
        max_length = int(max_length)
    if isinstance(min_length, str):
        min_length = int(min_length)

    markdown_list = []
    
    # Initialize the summarization pipeline
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    
    # Generate a summary
    summary = summarizer(article_text, max_length=max_length, min_length=min_length, do_sample=False)
    
    # Split the summary into sentences for bullet points
    bullet_points = summary[0]['summary_text'].split('. ')
    
    # Generate the markdown formatted result
    markdown_result = "\n".join([f"- {point.strip()}." for point in bullet_points if point.strip()])

    markdown_list.append(markdown_result)
    
    # Return the result in a dictionary
    return {"result": markdown_list}


def test():
    """Test the compute function."""

    print("Running test")
