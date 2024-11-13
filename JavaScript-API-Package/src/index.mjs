import axios from 'axios';
import cliSpinners from 'cli-spinners';
import { S3Client } from "@aws-sdk/client-s3";
import { S3SyncClient } from "s3-sync-client";

class Zetaforge {
  constructor(baseUrl = 'http://localhost:8080', token = null) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  getClient(configuration) { // direct copypaste from s3.js.
    const endpoint = `http://${configuration.s3.host}:${configuration.s3.port}`;
    return new S3Client({
      region: configuration.s3.region,
      credentials: {
        accessKeyId: configuration.s3.accessKeyId,
        secretAccessKey: configuration.s3.secretAccessKey,
      },
      endpoint: endpoint,
      forcePathStyle: "nothing needed here", // in s3 it was refering something.., here not needed.
    });
  }

  async run(uuid, hash, inputs, anvilConfiguration) {
    anvilConfiguration = JSON.parse(anvilConfiguration)
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
      let prev_status = '', frameIndex = 0;
      const spinner = cliSpinners.dots;

      do {
        response = await axios.get(statusUrl, { headers });
        if (prev_status == response.data.Status) { // print the cli-dots
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(`${spinner.frames[frameIndex]} `);
          frameIndex = (frameIndex + 1) % spinner.frames.length;
        }
        else {
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          console.log(`\n\nCurrent status: ${response.data.Status}`);
          prev_status = response.data.Status;
        }

        if (response.data.Status === 'Failed') {
          throw new Error('Execution failed.');
        }

        await new Promise(resolve => setTimeout(resolve, 400));

      } while (response.data.Status === 'Pending' || response.data.Status === 'Running');

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
              if (output != null) {
                const client = this.getClient(anvilConfiguration)
                const { sync } = new S3SyncClient({ client: client });
                const s3Path = `s3://${anvilConfiguration.s3.bucket}/${response.data.Organization}/${uuid}/${executeResponse.data.Execution}/${output.replace(/"/g, '')}`;
                const localPath = JSON.parse(response.data.Results).sink;
                await sync(s3Path, localPath);
                console.log(output , "file was downloaded in: " , localPath)
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

export default Zetaforge;