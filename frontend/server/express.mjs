import bodyParser from "body-parser";
import { spawn, exec } from "child_process";
import compression from "compression";
import cors from "cors";
import "dotenv/config";
import { app as electronApp } from "electron";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import sha256 from "sha256";
import getMAC from "getmac";
import { BLOCK_SPECS_FILE_NAME } from "../src/utils/constants";
import { computeAgent } from "../agents/gpt-4_python_compute/generate/computations.cjs";
import { computeViewAgent } from "../agents/gpt-4_python_view/generate/computations.cjs";
let anvilProcess = null;

function gracefullyStopAnvil() {
  if (anvilProcess !== null) {
    anvilProcess.kill("SIGINT");
    const sleep = new Promise((resolve) => setTimeout(resolve, 5000));
    sleep().then((res) => {
      console.log("schleepy shleep");
    });
  }
}

function startExpressServer() {
  const app = express();
  const port = 3330;

  app.use(
    cors({
      origin: "*",
    }),
  );
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
  app.use(
    "/result",
    express.static(
      path.join(electronApp.getPath("appData"), "zetaforge", ".cache") +
        path.sep,
    ),
  );
  app.use(bodyParser.json());

  const upload = multer();

  app.get("/distinct-id", async (req, res) => {
    try {
      const macAddress = getMAC();
      let macAsBigInt = BigInt(`0x${macAddress.split(":").join("")}`);

      // Check if the MAC address is universally administered
      const isUniversallyAdministered =
        (macAsBigInt & BigInt(0x020000000000)) === BigInt(0);

      // If not universally administered, set the multicast bit
      if (!isUniversallyAdministered) {
        macAsBigInt |= BigInt(0x010000000000);
      }
      const distinctId = sha256(macAsBigInt.toString());
      return res.send(distinctId);
    } catch (error) {
      console.log(
        "Can't generate distinct_id for mixpanel. Using default distinct_id",
      );
      console.log(error);
      return res.send(sha256(BigInt(0).toString())); // Sending default distinct_id
    }
  });

  app.get("/is-dev", async (req, res) => {
    return res.send(
      !electronApp.isPackaged ||
        (electronApp.isPackaged &&
          process.env.VITE_ZETAFORGE_IS_DEV === "True"),
    );
  });

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
    const specsPath = path.join(blockPath, BLOCK_SPECS_FILE_NAME);

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

  app.get("/get-kube-contexts", async (req, res) => {
    exec("kubectl version --client", (error, stdout, stderr) => {
      if (error) {
        res
          .status(500)
          .json({ message: "kubectl is not installed.", error: error.message });
        return;
      }
      if (stderr) {
        res.status(500).json({
          message: "kubectl is installed but there was an error.",
          stderr: stderr,
        });
        return;
      }
    });

    async function getKubectlContexts() {
      return new Promise((resolve, reject) => {
        const kubectl_config = ["config", "get-contexts", "-o", "name"];
        const kubeProcess = spawn("kubectl", kubectl_config);

        kubeProcess.stdout.on("data", (data) => {

          const contexts = data.toString().trim().split("\n");
          resolve(contexts);
        });
        kubeProcess.stderr.on("data", (data) => {
          reject(new Error("kubectl error: " + data.toString()));
        });

        kubeProcess.on("error", (err) => {

          reject(new Error("kubectl error" + err.toString()));
        });
      });
    }

    try {
      const contexts = await getKubectlContexts();
      res.status(200).json(contexts);
    } catch (err) {
      console.log(err);
      res.status(500).send(err.message);
    }
  });

  app.post("/api/call-agent", async (req, res) => {
    const { userMessage, agentName, conversationHistory, apiKey } = req.body;
    console.log("USER MESSAGE", userMessage);

    try {
      // Path to the Python script
      let agents = "agents";
      if (electronApp.isPackaged) {
        agents = path.join(process.resourcesPath, "agents");
      }
      const scriptPath = path.join(
        agents,
        agentName,
        "generate",
        "computations.py",
      );
      if (agentName === "gpt-4_python_compute") {
        try {
          const result = await computeAgent(
            userMessage,
            "gpt-4o",
            conversationHistory,
            apiKey,
          );

          res.send(result);
        } catch (err) {
          console.error("Server error:", err);
          res.status(500).send({ error: err.message });
        }
      } else {
        try {
          const result = await computeViewAgent(
            userMessage,
            "gpt-4o",
            conversationHistory,
            apiKey,
          );

          console.log("Received from compute function:", result);
          res.send(result);
        } catch (err) {
          console.error("Agent error:", err);
          res.status(500).send({ error: err.message });
        }
      }
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
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

  app.get("/get-anvil-config", (req, res) => {
    if (!electronApp.isPackaged) {
      const response = { has_config: false };
      res.status(200).send(response);
    }
    const anvilDir = path.join(process.resourcesPath, "server2");
    const anvilFiles = fs.readdirSync(anvilDir);
    if (anvilFiles.includes("config.json")) {
      const configFile = path.join(anvilDir, "config.json");
      const configStr = fs.readFileSync(configFile);
      const config = JSON.parse(configStr);
      const response = {
        has_config: true,
        config: config,
      };
      res.status(200).send(response);
    } else {
      const response = { has_config: false };
      res.status(200).send(response);
    }
  });

  app.post("/launch-anvil-from-config", (req, res) => {
    if (!electronApp.isPackaged) {
      return res.sendStatus(200);
    }

    const anvilTimeoutPromise = new Promise((resolve, reject) => {
      setTimeout(
        () => {
          reject(new Error("Anvil Timeout Error"));
        },
        3 * 60 * 1000,
      );
    });
    if (anvilProcess !== null) {
      anvilProcess.kill("SIGINT");
      anvilProcess = null;
      console.log("killed the process");
    }
    const anvilDir = path.join(process.resourcesPath, "server2");
    const configPath = path.join(anvilDir, "config.json");
    const configStr = fs.readFileSync(configPath);
    const config = JSON.parse(configStr);

    const context = config.KubeContext;
    const kubeConfig = ["config", "use-context", context];
    const kubeExec = spawn("kubectl", kubeConfig);

    kubeExec.stderr.on("data", (data) => {
      console.log(`stderr: ${data}`);
      res
        .status(500)
        .send({ err: "CAN'T SET KUBECONTEXT", kubeErr: data.toString() });
    });

    const anvilFiles = fs.readdirSync(anvilDir);
    const anvilExec = anvilFiles.filter((file) => file.startsWith("s2-"))[0];
    const runAnvil = new Promise((resolve, reject) => {
      anvilProcess = spawn(path.join(anvilDir, anvilExec), {
        cwd: anvilDir,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"], // Ignore stdin, use pipes for stdout and stderr
      });

      anvilProcess.stdout.on("data", (data) => {
        console.log(`[server] stdout: ${data}`);

        if (
          data.toString().includes("[GIN-debug] Listening and serving HTTP on")
        ) {
          resolve();
        }
      });

      anvilProcess.stderr.on("data", (data) => {
        console.log(`[server] stderr: ${data}`);
        if (
          data
            .toString()
            .toLowerCase()
            .includes("failed to fetch kubernetes resources;") ||
          data
            .toString()
            .toLowerCase()
            .includes("failed to get client config;") ||
          data.toString().toLowerCase().includes("failed to install argo;")
        ) {
          reject(new Error(`Kubeservices not found: ${data.toString()}`));
        }
      });

      anvilProcess.on("close", (code) => {});
    });

    const runAnvilPromise = Promise.race([anvilTimeoutPromise, runAnvil]);

    runAnvilPromise
      .then((response) => {
        res.sendStatus(200);
      })
      .catch((err) => {
        res
          .status(500)
          .send({ err: "Error while launching anvil", kubeErr: err.message });
      });
  });

  app.post("/launch-anvil", (req, res) => {
    const anvilTimeoutPromise = new Promise((resolve, reject) => {
      setTimeout(
        () => {
          reject(new Error("Anvil Timeout Error"));
        },
        3 * 60 * 1000,
      );
    });

    if (!electronApp.isPackaged) {
      res.sendStatus(200);
    }

    if (anvilProcess !== null) {
      anvilProcess.kill("SIGINT");
      anvilProcess = null;
      console.log("killed the process");
    }

    const anvilDir = path.join(process.resourcesPath, "server2");
    const body = req.body;

    const config = {
      IsLocal: true,
      IsDev: true ? process.env.VITE_ZETAFORGE_IS_DEV === "True" : false,
      ServerPort: parseInt(body.anvilPort),
      KanikoImage: "gcr.io/kaniko-project/executor:latest",
      WorkDir: "/app",
      FileDir: "/files",
      ComputationFile: "computations.py",
      EntrypointFile: "entrypoint.py",
      ServiceAccount: "executor",
      Bucket: "forge-bucket",
      Database: "./zetaforge.db",
      KubeContext: body.KubeContext,
      SetupVersion: "1",
      Local: {
        BucketPort: parseInt(body.s3Port),
        Driver: body.driver,
      },
    };
    const configDir = path.join(anvilDir, "config.json");
    const configStr = JSON.stringify(config);
    try {
      fs.writeFileSync(configDir, configStr);
    } catch (err) {
      res.status(500).send("Error happend while writing config.js");
    }
    const kubeConfig = ["config", "use-context", body.KubeContext];
    const kubeExec = spawn("kubectl", kubeConfig);
    kubeExec.stderr.on("data", (data) => {
      console.log(`stderr: ${data}`);
      res
        .status(500)
        .send({ err: "CAN'T SET KUBECONTEXT", kubeErr: data.toString() });
    });
    const anvilFiles = fs.readdirSync(anvilDir);

    const anvilExec = anvilFiles.filter((file) => file.startsWith("s2-"))[0];
    const runAnvil = new Promise((resolve, reject) => {
      anvilProcess = spawn(path.join(anvilDir, anvilExec), {
        cwd: anvilDir,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"], // Ignore stdin, use pipes for stdout and stderr
      });

      anvilProcess.stdout.on("data", (data) => {
        console.log(`[server] stdout: ${data}`);

        if (
          data.toString().includes("[GIN-debug] Listening and serving HTTP on")
        ) {
          console.log("ANVIL RUN SUCCESFULLY");
          resolve();
        }
      });

      anvilProcess.stderr.on("data", (data) => {
        console.log(`[server] stderr: ${data}`);
        if (
          data
            .toString()
            .toLowerCase()
            .includes("failed to fetch kubernetes resources;") ||
          data
            .toString()
            .toLowerCase()
            .includes("failed to get client config;") ||
          data.toString().toLowerCase().includes("failed to install argo;")
        ) {
          console.log("I AM REJECTING NOWWWWWW");
          reject(new Error(`Kubeservices not found: ${data.toString()}`));
        }
      });

      anvilProcess.on("close", (code) => {});
    });

    const runAnvilPromise = Promise.race([anvilTimeoutPromise, runAnvil]);

    runAnvilPromise
      .then((response) => {
        res.sendStatus(200);
      })
      .catch((err) => {
        res
          .status(500)
          .send({ err: "Error while launching anvil", kubeErr: err.message });
      });
  });

  app.get("/isPackaged", (req, res) => {
    const isPip = process.env.VITE_IS_PIP === "True" ? true : false;
    return res.status(200).json(electronApp.isPackaged && !isPip);
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

    let folderPath = data.block_name;
    const filePath = path.join(data.blockPath, "computations.py");

    fs.writeFile(filePath, data.computations_script, (err) => {
      if (err) {
        console.error("Error writing data to file:", err);
        res.status(500).send({ error: "Error writing data to file" });
        return;
      }
      res.send({ log: "Saved compute file to " + folderPath });
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

  process.on("SIGINT", () => {
    console.log("SIGINT ANVIL");
    if (anvilProcess !== null) {
      console.log("KILLING ANVIL...");
      anvilProcess.kill("SIGINT");
    }
  });

  process.on("SIGTERM", () => {
    console.log("SIGINT ANVIL");
    if (anvilProcess !== null) {
      console.log("KILLING ANVIL...");
      anvilProcess.kill("SIGINT");
    }
  });
}

export { startExpressServer, gracefullyStopAnvil };
