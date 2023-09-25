const express = require('express');
var fs = require('fs');
const path = require('path');

const { exec } = require('child_process');
const app = express();
const port = 3330;

app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));
app.use('/blocks', express.static(path.join(__dirname, '..', '..', 'blocks')));
app.use('/my_data', express.static(path.join(__dirname, '..', '..', 'my_data')));
app.use('/history', express.static(path.join(__dirname, '..', '..', 'history')));
app.use('/my_blocks', express.static(path.join(__dirname, '..', '..', 'my_blocks')));

app.use(express.json());
app.use(express.static(__dirname));
app.use(express.static('public'));

const { Configuration, OpenAIApi } = require("openai");

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Initialize PostgreSQL client
const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Connect to the database
client.connect();


function getActiveRun() {
    try {
        // Read the JSON file synchronously
        const data = fs.readFileSync(path.join(__dirname, '..', '..', 'history', 'active_run.json'), 'utf8');
        
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
  fs.readFile(filePath, 'utf-8', (err, data) => {
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

function get_graph(data, callback) {
  dotenv.config();
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });
  async function query() {
    try {
      // Connect to the PostgreSQL database
      await client.connect();
      const res = await client.query('SELECT * FROM my_table WHERE id = (SELECT max(id) FROM my_table)');      
      callback(null, res.rows);
    } catch (err) {
      console.error('Error:', err);
      callback(err);
    } finally {
      // Close the database connection
      await client.end();
    }
  }
  query();
}


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
  fs.readFile(path, 'utf8', function(err, data) {
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

  fs.writeFile(filePath, computations_script, (err) => {
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


app.post('/save-block', (req, res) => {
  const data = req.body;

  const filePath = path.join(__dirname, '..', '..', 'history', 'active_pipeline.json');

  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error('Error writing data to file:', err);
      res.status(500).send({ error: 'Error writing data to file' });
      return;
    }
    res.send({ log: 'Saved active_pipeline.json' });

  });
});


app.get('/log', (req, res) => {
  const active = getActiveRun()
  if (active && active.run_id) {
    fs.readFile(path.join(__dirname, '..', '..', 'history', active.run_id, 'full_logs.txt'), 'utf8', (err, data) => {
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
    
    fs.access(filePath, fs.constants.F_OK, (err) => {
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


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
