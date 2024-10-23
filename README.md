# Zetaforge Package

A Python package to interact with Zetaforge APIs for executing pipelines and retrieving results.

## Requirements

- **Python**: Version 3.6 or higher is required to run the `Zetaforge` package. You can download the latest version from the [Python official website](https://www.python.org/downloads/).

- **Dependencies**: Make sure to install the required packages by running:
  ```bash
    pip install requests yaspin
  ```

## Usage

To get started with the `Zetaforge` package, follow these steps:

### Step 1: Create a Python file

Create a new Python file (e.g., `main.py`) where you'll write your code to interact with the Zetaforge APIs.

### Step 2: Install the Zetaforge package

Navigate to your project directory and install the `Zetaforge` package by running:

```bash
pip install zetaforge
```

### Step 3: Import the Zetaforge class

In your Python file, import the `Zetaforge` class and create an instance:

```python
from zetaforge.Zetaforge import Zetaforge

# Create an instance of the Zetaforge class
zetaforge = Zetaforge('http://localhost:8080', 'YOUR_API_TOKEN')

pipeline_uuid = 'YOUR_PIPELINE_UUID'
pipeline_hash = 'YOUR_PIPELINE_HASH'
inputs = {
    "role": "GIVE IT A ROLE(like teacher, doctor, engineer or even plumber)",
    "prompt": "INSTRUCTIONS. SUCH AS: suggest me a place to visit this summer",
    "api_key": "YOUR API",
    "SOME_OTHER_KEY": "OTHER KEYS VALUE"
}

try:
    execute_response = zetaforge.run(pipeline_uuid, pipeline_hash, inputs)
    print("executeResponse:", execute_response)
except Exception as error:
    print('Failed to execute pipeline:', str(error))
    
```

## API

### `Zetaforge`

#### `Zetaforge(base_url, token)`

- **`base_url`** (String): The base URL of the Zetaforge API. Default is `'http://localhost:8080'`.
- **`token`** (String|null): Optional. The API token for authorization.

#### `run(uuid, hash, inputs)`

- **`uuid`** (String): The UUID of the pipeline.
- **`hash`** (String): The hash of the pipeline.
- **`inputs`** (Object): The inputs to be sent to the pipeline.

## Contact

For any inquiries, support, or contributions related to this project, please contact:

**Zetane**  
Email: [info@zetane.com](mailto:info@zetane.com)  
GitHub: [Zetane](https://github.com/zetane)

