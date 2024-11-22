from docling.document_converter import DocumentConverter

def compute(source):
    """A textual description of the compute function.

    Inputs:
        source: source html page to convert 

    Outputs:
        markdown_result : markdown converted result of the source page
    """
    # some code
    converter = DocumentConverter()
    result = converter.convert(source)  # Assuming in2 is a document path or URL
    markdown_result = result.document.export_to_markdown()

    return {"result": markdown_result}


def test():
    """Test the compute function."""

    print("Running test")
