from string import Template

def compute(in1):
    '''Generates an HTML file with a unique name and returns the file name.

    Inputs:
        None

    Outputs:
        dict: A dictionary with the key 'html' and the value being the name of the generated HTML file.

    Requirements:
        
    '''

    html_template = Template("""
<!DOCTYPE html>
<html>
<head>
    <title>Hello Block View</title>
</head>
<body>
    $in1
</body>
</html>
    """)

    # Build and save the html file
    html_path = f"view.html"
    html_code = html_template.substitute(in1=in1)
    with open(html_path, "w") as file:
        file.write(html_code)
  
    return {'html': f"view.html"}

def test():
    '''Test the compute function.'''

    print('Running test')
    result = compute('Hello view block')
    print(f"Generated HTML file: {result['html']}")
