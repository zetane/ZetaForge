# Zetaforge Package

A Node.js package to interact with Zetaforge APIs for executing pipelines and retrieving results.

## Installation

You can install this package via npm. Make sure you have Node.js installed on your machine.

```bash
npm install zetaforge
```

## Usage

Here’s a basic example of how to use the `zetaforge` package to execute a pipeline and retrieve the results.

```js
import Zetaforge from 'zetaforge';

const zetaforge = new Zetaforge('https://anvil.zetaforge.com:', 'YOUR_API_TOKEN');

const pipelineUuid = 'YOUR_PIPELINE_UUID';
const pipelineHash = 'YOUR_PIPELINE_HASH';
const inputs = {
  "role": "\"You are a very mean spirited naturalist.\"",
  "prompt": "\"Write an article about tigers\"",
  "api_key": "\"YOUR API\""
};

async function executePipeline() {
  try {
    const executeResponse = await zetaforge.run(pipelineUuid, pipelineHash, inputs);
    console.log("executeResponse: ", executeResponse);
  } catch (error) {
    console.error('Failed to execute pipeline:', error.message);
  }
}

executePipeline();
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


Feel free to reach out for any questions or issues you may have regarding the `zetaforge` package.