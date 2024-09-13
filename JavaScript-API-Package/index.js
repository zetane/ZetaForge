import axios from 'axios';

class Zetaforge {
  constructor(baseUrl = 'http://localhost:8080', token = null) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async run(uuid, hash, inputs) {
    const executeUrl = `${this.baseUrl}/pipeline/${uuid}/${hash}/execute`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };

    try {
      // Start execution
      const executeResponse = await axios.post(executeUrl, { inputs }, { headers });
      console.log("Execution started with:");
      console.log("Organization:", executeResponse.data.Organization);
      console.log("Created:", executeResponse.data.Created);
      console.log("ExecutionTime:", executeResponse.data.ExecutionTime);
      console.log("Uuid:", executeResponse.data.Uuid);
      console.log("Hash:", executeResponse.data.Hash);
      console.log("Execution:", executeResponse.data.Execution);
      console.log("\n\n");

      // Poll for execution status
      const executeId = executeResponse.data.Execution;
      const statusUrl = `${this.baseUrl}/execution/${executeId}`;
      let response;

      do {
        response = await axios.get(statusUrl, { headers });
        console.log("Current status:", response.data.Status);

        if (response.data.Status === 'Failed') {
          throw new Error('Execution failed.');
        }

        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds

      } while (response.data.Status === 'Pending' || response.data.Status === 'Running');

      console.log("\n\n");

      // Parse and return results

      const resultToParse = response.data.Results;
      const data = typeof resultToParse === 'string' ? JSON.parse(resultToParse) : resultToParse;

      // Extract outputs and strip parameters
      const outputs = {};
      for (const blockId in data.pipeline) {
        const block = data.pipeline[blockId];

        if (block.events && block.events.outputs) {
          outputs[blockId] = block.events.outputs;
        }

        if (block.action && block.action.parameters) {
          delete block.action.parameters;
        }
      }
      return JSON.stringify(outputs, null, 2);

    } catch (error) {
      console.error('Error during execution:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }
}

export default Zetaforge;
