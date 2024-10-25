# Zetaforge Package

A Node.js package to interact with Zetaforge APIs for executing pipelines and retrieving results.

## Requirements

- **Node.js**: Version 18 or higher is required to run the `zetaforge` package. You can download the latest version from the [Node.js official website](https://nodejs.org/).

## Usage

To get started with the `zetaforge` package, follow these steps:

### Step 1: Create a JavaScript file

Create a new JavaScript file (e.g., `index.js`) where you'll write your code to interact with the Zetaforge APIs.

### Step 2: Install the Zetaforge package

Open your terminal, navigate to your project directory, and run the following command to install the `zetaforge` package:

```bash
npm install zetaforge
```

### Step 3: Update your package.json
To use ES modules, ensure that your package.json includes the following line:
```bash
"type": "module"
```

* If the 'package.json' file is not created, create it and then include:
```bash
{
  "type": "module"
}
```
This setting allows you to use the import statement in your JavaScript files.

### Step 4:

```js
import Zetaforge from 'zetaforge';

const zetaforge = new Zetaforge('https://anvil.zetaforge.com:', 'YOUR_API_TOKEN');

const pipelineUuid = 'YOUR_PIPELINE_UUID';
const pipelineHash = 'YOUR_PIPELINE_HASH';
const inputs = {
  "role": "\"GIVE IT A ROLE(like teacher, doctor, engineer or even plumber\"",
  "prompt": "\"INSTRUCTIONS. SUCH AS : suggest me a place to visit in this summer\"",
  "api_key": "\"YOUR API\"",
	"SOME OTHER KEY" : "\"OTHER KEYS VALUE\""
};

async function executePipeline() {
  try {
    const executeResponse = await zetaforge.run(pipelineUuid, pipelineHash, inputs);
    console.log("executeResponse: ", executeResponse);
  } catch (error) {
    console.error('Failed to execute pipeline:', error.message);
  }
}

executePipeline(); // it will execute the pipeline....
```

## API

### `Zetaforge`

#### `new Zetaforge(baseUrl, token)`

- **`baseUrl`** (String): The base URL of the Zetaforge API. Default is `'http://localhost:8080'`.
- **`token`** (String|null): Optional. The API token for authorization.

#### `run(uuid, hash, inputs)`

- **`uuid`** (String): The UUID of the pipeline.
- **`hash`** (String): The hash of the pipeline.
- **`inputs`** (Object): The inputs to be sent to the pipeline.

## Contact

For any inquiries, support, or contributions related to this project, please contact:

**Zetane**  
Email: [info@zetane.com](info@zetane.com)  
GitHub: [Zetane](https://github.com/zetane)
