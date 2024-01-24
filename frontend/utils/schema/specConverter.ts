import fs from 'fs';
import path from 'path';

import { 
    Block, 
    Information, 
    Put, 
    Action, 
    Parameter, 
    Views, 
    Event, 
    Pipeline, 
    Connection 
} from './zjson-1';

const readSpecs = async (dir: string, transformFunc: Function) => {
  console.log("!!! CWD: ", process.cwd())

  try {
    const items = await fs.promises.readdir(dir);
    const specsData = [];

    for (const item of items) {
      try {
        const itemPath = path.join(dir, item)
        const stat = await fs.promises.stat(itemPath);
        const files = [];

        if (stat.isDirectory()) {
          const specs = path.join(itemPath, "specs.json");
          try {
            await fs.promises.stat(specs)
            transformFunc(specs)
          } catch (error) {
            console.log("ERROR: ", error)
            continue
          }
        }

      } catch (error) {
        console.log("ERRRRRROR: ", error)
      }

    }

  } catch (err) {
    console.error('Error reading directory:', err);
    throw err;
  }
}

// Function to read a JSON file
function readJsonFile<T>(filename: string): T {
    try {
        const rawData = fs.readFileSync(filename, 'utf-8');
        return JSON.parse(rawData) as T;
    } catch (error) {
        console.error("Error reading or parsing the file:", error);
        throw error;
    }
}

// Function to save a JSON file
function saveJsonFile(filename: string, data: any): void {
    try {
        const jsonData = JSON.stringify(data, null, 2);
        fs.writeFileSync(filename, jsonData, 'utf-8');
        console.log(`File saved: ${filename}`);
    } catch (error) {
        console.error("Error writing the file:", error);
        throw error;
    }
}

// Function to convert from specs to Block
function convertToBlock(input_block: any): Block {
    // Map the source JSON structure to the Block structure

    const blockInformation: Information = {
        id: input_block.information.id,
        name: input_block.information.name,
        description: input_block.information.description,
        system_versions: ['0.1'],
        block_version: input_block.information.block_version,
        block_source: input_block.action.block_source, 
        block_type: "" // Assuming this needs to be mapped from somewhere else in `sourceData`
    };

    const inputs: { [key: string]: Put } = {};
    for (const key in input_block.inputs) {
        let connections: Connection[] = []
        connections = input_block.inputs[key]?.connections.map((conn: any): Connection => {
            const newConn: Connection = {
                block: conn.node,
                variable: conn.output
            }
            return newConn
        })

        inputs[key] = {
            type: input_block.inputs[key].type,
            connections: connections,
            relays: input_block.inputs[key].relay_connections // Assuming relays map to relay_connections
        };
    }

    const outputs: { [key: string]: Put } = {};
    for (const key in input_block.outputs) {
        let connections: Connection[] = []
        connections = input_block.outputs[key]?.connections.map((conn: any): Connection => {
            const newConn: Connection = {
                block: conn.node,
                variable: conn.input
            }
            return newConn
        })

        outputs[key] = {
            type: input_block.outputs[key].type,
            connections: connections,
            relays: input_block.outputs[key].relay_connections // Assuming relays map to relay_connections
        };
    }

    let action: Action = {}

    if (Object.keys(input_block.parameters).length > 0) {
        const parameters: { [key: string]: Parameter } = {};
        for (const key in input_block.parameters) {
            parameters[key] = {
                type: input_block.parameters[key].type,
                value: input_block.parameters[key].value
            }
        }
        action = {
            parameters: parameters
        }
    } else {
        console.log("ACTION: ", input_block.action)
        console.log("VERSION: ", input_block.action["version"])
        action = {
            container: {
                // Assuming the container fields need to be mapped from action section
                image: input_block.action.container_image_uuid,
                version: input_block.action.version,
                command_line: ['python', 'entrypoint.py'] // Assuming this needs to be filled based on your JSON structure
            },
        };
    }

    const bgColor = input_block.views.node?.title_bar?.background_color 
    const preview = input_block.views.node?.preview?.active
    const behavior = input_block.views.mode

    const views: Views = {
        node: {
            behavior: behavior ? behavior : "",
            active: "true",
            title_bar: {
                background_color: bgColor ? bgColor : "#D55908",
            },
            preview: {
                active: preview ? "true" : "false"
            },
            html: input_block.views.node.html,
            pos_x: input_block.views.node.pos_x.toString(),
            pos_y: input_block.views.node.pos_y.toString(),
            pos_z: input_block.views.node.pos_z.toString(),
        }
    };

    const events: Event = {};

    const block: Block = {
        information: blockInformation,
        inputs: inputs,
        outputs: outputs,
        action: action,
        views: views,
        events: events
    }

    console.log(block)
    return block
}

const blockFileConverter = (sourceFile: string) => {
    const targetFilename = `${sourceFile}_v1.json`; // Replace with your target JSON file path

    try {
        const sourceData = readJsonFile<any>(sourceFile);
        const blockData = convertToBlock(sourceData.block);
        saveJsonFile(targetFilename, blockData);
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

const pipelineConverter = (pipeline: string) => {
    const sourceFilename = `${pipeline}.json`
    const target = `../../../pipelines/${pipeline}-v1.json`

    try {
        const sourceData = readJsonFile<string>(sourceFilename);
        const blocks: { [key: string]: Block } = {}
        console.log(Object.keys(sourceData))
        for (const key of Object.keys(sourceData) as Array<string>) {
            console.log("key: ", key)
            let originalBlock = sourceData[key as any]
            console.log(originalBlock)
            blocks[key] = convertToBlock(originalBlock)
        }
        const pipeline: Pipeline = {
            id: "1",
            pipeline: blocks,
            source: "./my_data",
            sink: "./history",
            build: "./my_pipelines"
        }
        saveJsonFile(target, pipeline)
    } catch (error) {
        console.error("An error occured:", error)
    }
}

const pipeline = 'demo_training_multiple_iris'
pipelineConverter(pipeline)

//readSpecs('../../../blocks', blockFileConverter)
