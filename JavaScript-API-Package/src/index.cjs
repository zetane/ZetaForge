const axios = require('axios');
const DotPrinter = require('./dotPrinter.cjs');
const { S3Client } = require('@aws-sdk/client-s3');
const { S3SyncClient } = require('s3-sync-client');

class Zetaforge {
  constructor(baseUrl = 'http://localhost:8080', pipelineToken = null) {
    this.baseUrl = baseUrl;
    [this.token , ...this.parts] = pipelineToken.split('|~')
  }

  async run(uuid, hash, inputs) {
    const executeUrl = `${this.baseUrl}/pipeline/${uuid}/${hash}/execute`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };

    const dotPrinter = new DotPrinter();

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
      let prev_status = '';
      
      dotPrinter.start();
      do {
        response = await axios.get(statusUrl, { headers });
        if (prev_status == response.data.Status) {
          // process.stdout.clearLine(0);
          // process.stdout.cursorTo(0);
        }
        else {
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          console.log(`\n\nCurrent status: ${response.data.Status}`);
          prev_status = response.data.Status;
        }

        if (response.data.Status === 'Failed') {
          dotPrinter.stop();
          throw new Error('Execution failed.');
        }

        await new Promise(resolve => setTimeout(resolve, 400));

      } while (response.data.Status === 'Pending' || response.data.Status === 'Running');

      dotPrinter.stop();

      await new Promise(resolve => setTimeout(resolve, 600)); // some delay to fetch response.

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

      try { // try download output files:
        for (const blockId in data.pipeline) {
          const block = data.pipeline[blockId];
          if (block.events && block.events.outputs) {
            const outputs = block.events.outputs;
            for (const outputKey in outputs) {
              const output = outputs[outputKey];
              // console.log(">>> output: ", output)
              const temp_endpoint = 'http://s3-us-east-2.amazonaws.com:80';
              if (output != null) {
                const client = new S3Client({
                  region: 'us-east-2',
                  credentials: {
                    accessKeyId: this.parts[0],
                    secretAccessKey: this.parts[1],
                  },
                  endpoint: temp_endpoint,
                  forcePathStyle: "nothing needed here"
                })
                const { sync } = new S3SyncClient({ client: client });
                const s3Path = `s3://${this.parts[2]}/${response.data.Organization}/${uuid}/${executeResponse.data.Execution}/${output.replace(/"/g, '')}`;

                const localPath = JSON.parse(response.data.Results).sink;
                await sync(s3Path, localPath);
                console.log(output, "file was downloaded in: ", localPath)
              }
            }
          }

          if (block.action && block.action.parameters) {
            delete block.action.parameters;
          }
        }
      }
      catch (error) {
        console.log("ERROR DOWNLOADING FILE. error is: ", error)
        return JSON.stringify(outputs, null, 2); // return the response anway.
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
module.exports = Zetaforge;