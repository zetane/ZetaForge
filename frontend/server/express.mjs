import { SPECS_FILE_NAME } from "@/utils/constants.js";
import bodyParser from "body-parser";
import { exec, spawn } from "child_process";
import compression from "compression";
import cors from "cors";
import 'dotenv/config';
import { app as electronApp } from 'electron';
import express from "express";
import fs, { access, constants, readFile, readFileSync, writeFile } from "fs";
import fsp from "fs/promises";
import getMAC from "getmac";
import multer from "multer";
import { Configuration, OpenAIApi } from "openai";
import path from "path";
import sha256 from 'sha256';
import { fileExists, readJsonToObject, readSpecs } from "./fileSystem.js";
import { copyPipeline, saveBlock } from "./pipelineSerialization.js";


function startExpressServer() {
  const app = express();
  const port = 3330;

  app.use(cors())
  app.use(compression());

  // http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
  app.disable("x-powered-by");
  //app.use(express.static(path.join(__dirname, '..', '..', 'backup_frontend')));
  //app.use('/blocks', express.static(path.join(__dirname, '..', '..', 'blocks')));
  //app.use('/my_data', express.static(path.join(__dirname, '..', '..', 'my_data')));
  //app.use('/history', express.static(path.join(__dirname, '..', '..', 'history')));
  //app.use('/my_blocks', express.static(path.join(__dirname, '..', '..', 'my_blocks')));
  // handle asset requests

  // Everything else (like favicon.ico) is cached for an hour. You may want to be
  // more aggressive with this caching.
  app.use(express.json());
  app.use(express.static('public'));
  app.use(bodyParser.json());

  // OpenAI
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  const upload = multer({ dest: "_temp_import" });

  function getActiveRun() {
      try {
          // Read the JSON file synchronously
          const data = readFileSync(path.join(__dirname, '..', '..', 'history', 'active_run.json'), 'utf8');
          
          // Parse the JSON content
          const parsedData = JSON.parse(data);

          return parsedData;
      } catch (err) {
          // console.error("Error reading or parsing the JSON file:", err);
          return null;
      }
  }


  function get_graph_local(callback) {  
    const active = getActiveRun();
    const filePath = path.join(__dirname, '..', '..', 'history', active.run_id, 'results', 'computed_pipeline_'+active.inference+'.json');

    // Read the JSON file asynchronously
    readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        console.error('Error:', err);
        callback(err);
        return;
      }
      
      // Convert string content to JSON
      const jsonData = JSON.parse(data);
      callback(null, jsonData);
    });
  }


  app.get('/ruok', async (req, res) => {
    res.sendStatus(200)
  })

  app.post('/get-table', async (req, res) => {
    try {
      const graph = req.body.graph;
      // Get all rows from a table
      const query = 'SELECT * FROM my_table;';
      // Use the client to send the query to the PostgreSQL server
      const result = await client.query(query);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  app.post('/api/chat-with-gpt', async (req, res) => {
    const userMessage = req.body.message;

    try {
      const chatCompletion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{role: "user", content: userMessage}],
      });

      res.json({message: chatCompletion.data.choices[0].message});
    } catch (error) {
      res.status(500).json({ error: 'An error occurred' });
    }
  });


  app.post('/get-graph', (req, res) => {
    const data = req.body;
    // Get graph from local database
    get_graph(JSON.stringify(data, null, 2), (err, response) => {
      if (err) {
        console.error('Error:', err);
        res.status(500).send({ error: 'An error occurred while processing the request' });
        return;
      }

      res.status(200).send({ message: 'Request processed successfully', data: response });
    });
  });


  app.post('/get-graph-local', (req, res) => {
    // Call the local JSON graph 
    get_graph_local((err, response) => {
      if (err) {
        console.error('Error:', err);
        res.status(500).send({ error: 'An error occurred while processing the request' });
        return;
      }

      res.status(200).send({ message: 'Request processed successfully', data: response });
    });
  });


  app.post('/get-code', (req, res) => {
    const path = req.body.file_path;
    readFile(path, 'utf8', function(err, data) {
      // fs.readFile('__my_file.txt', 'utf8', function(err, data) {
        if (err) {
            console.error('Error reading file:', err);
            res.status(500).send({ error: 'An error occurred while processing the request' });
            return;
        }
        res.status(200).send({ message: 'Request processed successfully', data: data });
    });
  });


  app.post('/run-computations', (req, res) => {
    let command = '';

    command = 'python ../python/manager.py';
    if (req.body.build == 'false'){
      command += ' --build "false"';
    }
    if (req.body.compute == 'kubernetes_docker_desktop'){
      command += ' --compute "kubernetes_docker_desktop"'
    }  
    console.log('Command', command)

    const filePath = path.join(__dirname, '..', '..', 'history', 'active_pipeline.json');

    exec(command + ' '+ filePath, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        res.status(500).send({ error: error.message });
        return;
      }
      res.send({ stdout: stdout, stderr: stderr });
      console.log("stdout", stdout, "stderr", stderr )
    });
  });


  app.post('/new-block', (req, res) => {
    const data = req.body;

    function unescape(s) {
      return s.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }

    let folderPath = data.block_name;
    // Create the temp file path
    let filePath = path.join(__dirname, '..', '..', 'my_blocks', 'temp_computations.py');

    // Unescape the script
    let computations_script = unescape(data.computations_script);

    writeFile(filePath, computations_script, (err) => {
      if (err) {
        console.error('Error writing data to file:', err);
        res.status(500).send({ error: 'Error writing data to file' });
        return;
      }

      let command = 'python ../python/create_new_block.py --block_name '+ data.block_name + ' --block_user_name ' + data.block_user_name;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          res.status(500).send({ error: error.message });
          return;
        }
        res.send({ stdout: stdout, stderr: stderr, log: 'Saved compute file to ' + folderPath });
        console.log("stdout", stdout, "stderr", stderr )
      });
    });
  });

  app.get('/log', (req, res) => {
    const active = getActiveRun()
    if (active && active.run_id) {
      readFile(path.join(__dirname, '..', '..', 'history', active.run_id, 'full_logs.txt'), 'utf8', (err, data) => {
          if (err) {
              console.error(err);
              res.sendStatus(500);
          } else {
              res.send(data);
          }
      });
    }
  });

  app.get('/get-history-local', (req, res) => {
    const active = getActiveRun()
    if (active && active.run_id) {
      const filePath = path.join(__dirname, '..', '..', 'history', active.run_id, 'results', 'computed_pipeline_1.json');
      
      access(filePath, constants.F_OK, (err) => {
          if (err) {
              console.error(`File not found: ${filePath}`);
              return res.status(404).json({ error: "File not found" });
          }

          res.sendFile(filePath, (err) => {
              if (err) {
                  console.error(`Error sending the file: ${err}`);
                  return res.status(500).json({ error: "Internal Server Error" });
              }
          });
      });
    }
  });

  app.post('/pipeline', async (req, res) => {
    const {specs, name, buffer, writePath} = req.body?.data;

    try {
      // Copy from our buffer dir to the save dir
      const savePaths = await copyPipeline(specs, name, buffer, writePath);
      return res.status(200).json(savePaths)
    } catch (error) {
      return res.status(500).json({error: `Internal Server Error: ${error}`})
    }
  });

  // POST `/block` saves block
  app.post('/block', async (req, res) => {
    console.log(req.body)
    try {
      const {blockSpec, blockPath, pipelinePath} = req.body;
      const savePaths = await saveBlock(blockSpec, blockPath, pipelinePath);
      return res.status(200).json(savePaths)
    } catch (error) {
      return res.status(500).json({error: `Internal Server Error: ${error}`})
    }
  });

  app.get('/blocks', async (req, res) => {
    const coreBlocks = "../core/blocks"
    if(electronApp.isPackaged){
      coreBlocks = path.join(process.resourcesPath, "core", "blocks") 
    }
    
    try {
      const blocks = await readSpecs(coreBlocks)
      return res.status(200).json(blocks);
    } catch (error) {
      return res.status(500).json({error: error})
    }
  })

  app.get('/distinct-id', async(req, res) => {

    try {
      const macAddress = getMAC();
      let macAsBigInt = BigInt(`0x${macAddress.split(':').join('')}`);
      
      // Check if the MAC address is universally administered
      const isUniversallyAdministered = (macAsBigInt & BigInt(0x020000000000)) === BigInt(0);
      
      // If not universally administered, set the multicast bit
      if (!isUniversallyAdministered) {
          macAsBigInt |= BigInt(0x010000000000);
      }
      const distinctId = sha256(macAsBigInt.toString());
      return res.send(distinctId);
    } catch (error) {
      console.log("Can't generate distinct_id for mixpanel. Using default distinct_id");
      console.log(error);
      return res.send(sha256(BigInt(0).toString())); // Sending default distinct_id
    }
});

app.get("/is-dev", async(req, res) => {
  return res.send( !electronApp.isPackaged || (electronApp.isPackaged && process.env.VITE_ZETAFORGE_IS_DEV === 'True') )
})

   
  

  app.post("/import-files", upload.array("files"), (req, res) => {
    const files = req.files;

    files.forEach((file) => {
      const targetPath = path.join(req.body.blockPath, file.originalname);

      // Move file from temporary location to target directory
      fs.renameSync(file.path, targetPath);
    });

    res.send("Files imported successfully");
  });

  app.post("/import-folder", upload.array("files"), (req, res) => {
    const files = req.files;
    const paths = req.body.paths;

    if (!Array.isArray(paths) || paths.length !== files.length) {
      return res.status(400).send("Mismatch between files and paths data.");
    }

    files.forEach((file, index) => {
      const relativePath = paths[index];
      const targetPath = path.join(req.body.blockPath, relativePath);
      const directory = path.dirname(targetPath);

      // Create directory if it doesn't exist, including any nested subdirectories
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Move file from temporary location to target directory
      fs.renameSync(file.path, targetPath);
    });

    res.send("Folder imported successfully");
  });


  app.post("/save-file", (req, res) => {
    const { pipelinePath, filePath, content } = req.body;
    const pipelineFilePath = path.join(pipelinePath, filePath);

    fs.writeFile(pipelineFilePath, content, (err) => {
      if (err) {
        console.error("Error writing data to file:", err);
        res.status(500).send({ error: "Error writing data to file" });
        return;
      }
      res.send({ log: `Saved file at ${filePath}` });
    });
  });

  app.post("/get-agent", async (req, res) => {
    const { blockPath } = req.body;
    const specsPath = path.join(blockPath, SPECS_FILE_NAME)
    
    fs.readFile(specsPath, (err, data) => {
      if (err) {
        console.error(`Error sending the file: ${err}`);
        res.status(500).json({ error: "Could not retrieve agent" });
        return;
      }

      const specs = JSON.parse(data);
      if (specs.information.block_type == "view") {
        res.status(200).json("gpt-4_python_view");
      } else {
        res.status(200).json("gpt-4_python_compute");
      }
    });
  });

  app.post("/get-chat-history", async (req, res) => {
    const { blockPath } = req.body;
    const chatHistoryPath = path.join(blockPath, "chatHistory.json");
    let history = undefined;
    if ((await fileExists(chatHistoryPath))) {
      history = await readJsonToObject(chatHistoryPath);
    } else {
      const codeTemplatePath = path.join(blockPath, "computations.py");
      const codeTemplate = await fsp.readFile(codeTemplatePath, "utf8");
      history = [{
          timestamp: Date.now(),
          prompt: "Code Template",
          response: codeTemplate,
      }];      
    }
    res.send(history);
  });

  app.post("/api/call-agent", async (req, res) => {
    const { userMessage, agentName, conversationHistory, apiKey} = req.body
    console.log("USER MESSAGE", userMessage);
  
    try {
      // Path to the Python script
      let agents = "agents"
      if(electronApp.isPackaged) {
        agents = path.join(process.resourcesPath, "agents")
      }
      const scriptPath = path.join(agents, agentName, "generate", "computations.py")
      const pythonProcess = spawn("python", [scriptPath]);

      const inputData = { apiKey, userMessage, conversationHistory };
      pythonProcess.stdin.write(JSON.stringify(inputData));
      pythonProcess.stdin.end();

      // Collect data from the Python script
      let scriptOutput = "";
      pythonProcess.stdout.on("data", (data) => {
        scriptOutput += data.toString();
      });

      pythonProcess.stdout.on("end", () => {
        console.log("Received from Python script:", scriptOutput);
        try {
          res.send(JSON.parse(scriptOutput));
        } catch (parseError) {
          console.error("Error parsing script output:", parseError);
          res.status(500).send({ error: "Error parsing script output" });
        }
      });

      pythonProcess.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          console.log(`Python script exited with code ${code}`);
          res.status(500).send({ error: "Python script error" });
        }
      });
    } catch (err) {
      console.error("Server error:", err);
      res.status(500).send({ error: "Internal server error" });
    }
  });

  app.post('/save-chat-history', async (req, res) => {
    const { blockPath, history } = req.body;

    const chatHistoryPath = path.join(blockPath, "chatHistory.json");
    await fsp.writeFile(chatHistoryPath, JSON.stringify(history, null, 2));

    res.status(200);
  });

  app.post("/get-directory-tree", (req, res) => {
    const blockFolder = req.body.folder;
    try {
      const fileSystem = getFileSystemContent(blockFolder);
      res.json(fileSystem);
    } catch (err) {
      console.error("Error reading directory:", err);
      res.status(500).send({ error: "Error reading directory" });
    }
  });

  const getFileSystemContent = (dirPath) => {
    const fileSystem = {};

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.forEach((entry) => {
      if (entry.isDirectory()) {
        // If the entry is a directory, recurse into it
        fileSystem[entry.name] = {
          type: "folder",
          expanded: false,
          content: getFileSystemContent(path.join(dirPath, entry.name)), // Recursive call
        };
      } else {
        // Determine the file extension
        const ext = path.extname(entry.name).toLowerCase();

        // Read content if the file has one of the specified extensions
        let fileContent = `This file type is not supported for display.\n`; // Default placeholder content
        if (
          [
            ".json",
            ".py",
            ".txt",
            ".html",
            ".gitkeep",
            ".md",
            ".yaml",
            ".bat",
          ].includes(ext) ||
          entry.name == "Dockerfile" ||
          entry.name == "LICENSE"
        ) {
          const fullPath = path.join(dirPath, entry.name);
          try {
            fileContent = fs.readFileSync(fullPath, "utf8");
          } catch (error) {
            console.error(`Error reading file ${entry.name}:`, error);
            fileContent = `Error reading file ${entry.name}`;
          }
        }

        // Store file information
        fileSystem[entry.name] = {
          type: "file",
          content: fileContent,
        };
      }
    });

    return fileSystem;
  };

  app.post("/new-block-react", (req, res) => {
    const data = req.body;

    function unescape(s) {
      return s
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }

    let folderPath = data.block_name;
    const filePath = path.join(data.blockPath, "computations.py");
    const computations_script = unescape(data.computations_script);

    fs.writeFile(filePath, computations_script, (err) => {
      if (err) {
        console.error("Error writing data to file:", err);
        res.status(500).send({ error: "Error writing data to file" });
        return;
      }
      res.send({log: "Saved compute file to " + folderPath});
    });
  });

  app.get("/api/logs", (req, res) => {
    const filePath = req.query.filePath;

    // Check if the file exists
    if (fs.existsSync(filePath)) {
      // File exists, read and return its content
      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error reading log file");
        }
        res.send(data);
      });
    } else {
      // File does not exist, send a default message or an empty string
      res.send("Logs not available yet");
    }
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

export { startExpressServer };

