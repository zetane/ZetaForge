import { app } from "electron";
import fs from "fs/promises";
import path from "path";
import { logger } from "./logger";
import {
  BLOCK_SPECS_FILE_NAME,
  SUPPORTED_FILE_EXTENSIONS,
  SUPPORTED_FILE_NAMES,
  CHAT_HISTORY_FILE_NAME,
} from "../src/utils/constants";
import { fileExists } from "./fileSystem";
import { HttpStatus, ServerError } from "./serverError";
import { compileComputationFunction } from "../resources/compileComputation.mjs";
import { runTestContainer } from "../resources/runTest.mjs";

const READ_ONLY_FILES = [BLOCK_SPECS_FILE_NAME, CHAT_HISTORY_FILE_NAME];

export async function compileComputation(pipelinePath, blockId) {
  const blockPath = path.join(pipelinePath, blockId);
  const sourcePath = path.join(pipelinePath, blockId, "computations.py");
  const source = await fs.readFile(sourcePath, { encoding: "utf8" });

  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, "resources", "compileComputation.mjs")
    : path.join("resources", "compileComputation.mjs");
  if (!(await fileExists(scriptPath))) {
    throw new ServerError(
      `Could not find script for compilation: ${scriptPath}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  let io;
  try {
    io = await compileComputationFunction(source);
  } catch (err) {
    logger.error(err.message, buildCompilationErrorLog(blockPath, scriptPath));
    throw buildCompilationServerError();
  }
  return io;
}

export async function saveBlockSpecs(pipelinePath, blockId, specs) {
  const specsPath = path.join(pipelinePath, blockId, BLOCK_SPECS_FILE_NAME);

  removeConnections(specs.inputs);
  removeConnections(specs.outputs);

  specs.views.node.pos_x = 0;
  specs.views.node.pos_y = 0;

  await fs.writeFile(specsPath, JSON.stringify(specs, null, 2));
}

function removeConnections(io) {
  for (const key in io) {
    io[key].connections = [];
  }

  return io;
}

export async function runTest(pipelinePath, blockId) {
  const blockPath = path.join(pipelinePath, blockId);
  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, "resources", "runTest.mjs")
    : path.join("resources", "runTest.mjs");
  if (!(await fileExists(scriptPath))) {
    throw new ServerError(
      `Could not find script for running tests: ${scriptPath}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  return await runTestContainer(blockPath, blockKey);
}

function isFileSupported(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);

  return (
    SUPPORTED_FILE_EXTENSIONS.includes(extension) ||
    SUPPORTED_FILE_NAMES.includes(basename)
  );
}

export async function callAgent(
  userMessage,
  agentName,
  conversationHistory,
  apiKey,
) {
  let agents = "agents";
  if (app.isPackaged) {
    agents = path.join(process.resourcesPath, "agents");
  }
  const scriptPath = path.join(
    agents,
    agentName,
    "generate",
    "computations.py",
  );

  try {
    const stdout = await spawnAsync("python", [scriptPath], {
      input: JSON.stringify({
        apiKey,
        userMessage,
        conversationHistory,
      }),
      encoding: "utf8",
    });
    const response = JSON.parse(stdout).response;
    return response;
  } catch (error) {
    const message = `Unable to call agent ${agentName} with message ${userMessage}`;
    logger.error(error, message);
    throw new ServerError(message, HttpStatus.INTERNAL_SERVER_ERROR, error);
  }
}

export async function getLogs(pipelinePath, blockId) {
  const logsPath = path.join(pipelinePath, blockId, "logs.txt");

  if (!(await fileExists(logsPath))) {
    return "Logs not yet available";
  }

  return await fs.readFile(logsPath, "utf8");
}
