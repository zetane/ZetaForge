import { spawnAsync } from "./spawnAsync";
import { app } from "electron";
import fs from "fs/promises";
import path from "path";
import {
  BLOCK_SPECS_FILE_NAME,
  SUPPORTED_FILE_EXTENSIONS,
  SUPPORTED_FILE_NAMES,
  CHAT_HISTORY_FILE_NAME,
} from "../src/utils/constants";
import { fileExists, getDirectoryTree } from "./fileSystem";
import { logger } from "./logger";
import { HttpStatus, ServerError } from "./serverError";

const READ_ONLY_FILES: string[] = [
  BLOCK_SPECS_FILE_NAME,
  CHAT_HISTORY_FILE_NAME,
];

export async function compileComputation(
  pipelinePath: string,
  blockId: string,
): Promise<any> {
  const blockPath = path.join(pipelinePath, blockId);
  const sourcePath = path.join(pipelinePath, blockId, "computations.py");
  let source: string;
  try {
    source = await fs.readFile(sourcePath, { encoding: "utf8" });
  } catch (error: any) {
    const message = `Failed to read computation file: ${sourcePath}`;
    logger.error(error, message);
    throw new ServerError(message, HttpStatus.INTERNAL_SERVER_ERROR, error);
  }

  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, "resources", "compileComputation.py")
    : path.join("resources", "compileComputation.py");
  if (!(await fileExists(scriptPath))) {
    throw new ServerError(
      `Could not find script for compilation: ${scriptPath}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      null,
    );
  }

  let stdout = "";

  try {
    stdout = await spawnAsync("python", [scriptPath], {
      input: source,
      encoding: "utf8",
    });
    const io = JSON.parse(stdout);
    return io;
  } catch (error: any) {
    const message = `Compilation failed for block \nblock path: ${blockPath} \nscript path: ${scriptPath}\n${stdout}`;
    logger.error(error, message);
    throw new ServerError(message, HttpStatus.INTERNAL_SERVER_ERROR, error);
  }
}

interface BlockSpecs {
  inputs: Record<string, { connections: any[] }>;
  outputs: Record<string, { connections: any[] }>;
  views: {
    node: {
      pos_x: number;
      pos_y: number;
    };
  };
}

export async function saveBlockSpecs(
  pipelinePath: string,
  blockId: string,
  specs: BlockSpecs,
): Promise<void> {
  const specsPath = path.join(pipelinePath, blockId, BLOCK_SPECS_FILE_NAME);

  removeConnections(specs.inputs);
  removeConnections(specs.outputs);

  specs.views.node.pos_x = 0;
  specs.views.node.pos_y = 0;

  try {
    await fs.writeFile(specsPath, JSON.stringify(specs, null, 2));
  } catch (error: any) {
    const message = `Failed to save block specifications to: ${specsPath}`;
    logger.error(error, message);
    throw new ServerError(message, HttpStatus.INTERNAL_SERVER_ERROR, error);
  }
}

export function removeConnections(
  io: Record<string, { connections: any[] }>,
): Record<string, { connections: any[] }> {
  for (const key in io) {
    if (Object.prototype.hasOwnProperty.call(io, key)) {
      io[key].connections = [];
    }
  }
  return io;
}

export async function runTest(
  pipelinePath: string,
  blockId: string,
): Promise<void> {
  const blockPath = path.join(pipelinePath, blockId);
  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, "resources", "run_test.py")
    : path.join("resources", "run_test.py");
  if (!(await fileExists(scriptPath))) {
    logger.error("Test script not found");
    throw new ServerError(
      `Could not find script for running tests: ${scriptPath}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      null,
    );
  }

  try {
    await spawnAsync("python", [scriptPath, blockPath, blockId]);
  } catch (error: any) {
    const message = `Failed to run tests for block \nblock path: ${blockPath} \nscript path: ${scriptPath}`;
    logger.error(error, message);
    throw new ServerError(message, HttpStatus.INTERNAL_SERVER_ERROR, error);
  }
}

export async function getBlockDirectory(pipelinePath: string, blockId: string) {
  const blockDirectory = path.join(pipelinePath, blockId);

  try {
    const tree = await getDirectoryTree(blockDirectory, filePermissionVisitor);
    return tree;
  } catch (error: any) {
    const message = `Failed to get directory tree for: ${blockDirectory}`;
    logger.error(error, message);
    throw new ServerError(message, HttpStatus.INTERNAL_SERVER_ERROR, error);
  }
}

export function filePermissionVisitor(
  name: string,
  absolutePath: string,
  relativePath: string,
  isDirectory: boolean,
): { read: boolean; write: boolean } {
  if (isDirectory) {
    return {
      read: true,
      write: true,
    };
  } else {
    return getFilePermissions(name);
  }
}

export async function getBlockFile(
  pipelinePath: string,
  blockId: string,
  relativeFilePath: string,
): Promise<string> {
  const absoluteFilePath = path.join(pipelinePath, blockId, relativeFilePath);
  const fileName = path.basename(absoluteFilePath);
  const { read } = getFilePermissions(fileName);

  if (!read) {
    const message = `Reading file: ${absoluteFilePath}, is not permitted`;
    logger.error(message);
    throw new ServerError(message, HttpStatus.BAD_REQUEST, null);
  }

  try {
    return await fs.readFile(absoluteFilePath, { encoding: "utf8" });
  } catch (error: any) {
    const message = `Failed to read file: ${absoluteFilePath}`;
    logger.error(error, message);
    throw new ServerError(message, HttpStatus.INTERNAL_SERVER_ERROR, error);
  }
}

export async function updateBlockFile(
  pipelinePath: string,
  blockId: string,
  relativeFilePath: string,
  content: string,
): Promise<void> {
  const absoluteFilePath = path.join(pipelinePath, blockId, relativeFilePath);
  const fileName = path.basename(absoluteFilePath);
  const { write } = getFilePermissions(fileName);

  if (!write) {
    const message = `Writing file: ${absoluteFilePath}, is not permitted`;
    logger.error(message);
    throw new ServerError(message, HttpStatus.BAD_REQUEST, null);
  }

  try {
    await fs.writeFile(absoluteFilePath, content);
  } catch (error: any) {
    const message = `Failed to write to file: ${absoluteFilePath}`;
    logger.error(error, message);
    throw new ServerError(message, HttpStatus.INTERNAL_SERVER_ERROR, error);
  }
}

interface FilePermissions {
  read: boolean;
  write: boolean;
}

export function getFilePermissions(name: string): FilePermissions {
  const readOnly = READ_ONLY_FILES.includes(name);
  const supported = isFileSupported(name);

  const read = supported;
  const write = supported && !readOnly;

  return { read, write };
}

function isFileSupported(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);

  return (
    SUPPORTED_FILE_EXTENSIONS.includes(extension) ||
    SUPPORTED_FILE_NAMES.includes(basename)
  );
}

export async function callAgent(
  userMessage: string,
  agentName: string,
  conversationHistory: any, // Consider creating a specific type for conversation history
  apiKey: string,
): Promise<any> {
  let agents = "agents";
  if (app.isPackaged) {
    agents = path.join(process?.resourcesPath ?? "", "agents");
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

    const parsedOutput = JSON.parse(stdout);

    // Check if the response contains an error
    if (parsedOutput.error) {
      const errorDetails: any = parsedOutput.error; // Consider creating a specific type for error details
      throw new ServerError(
        errorDetails.message,
        errorDetails.status_code || HttpStatus.INTERNAL_SERVER_ERROR,
        {
          name: errorDetails.type,
          message: errorDetails.traceback,
        },
      );
    }

    const response = parsedOutput.response;
    return response;
  } catch (error: any) {
    // If the error is already a ServerError (from our error handling above), throw it directly
    if (error instanceof ServerError) {
      throw error;
    }

    // Handle other errors (like JSON parsing errors or spawn errors)
    const message = `Unable to call agent ${agentName} with message ${userMessage}`;
    logger.error(error, message);
    throw new ServerError(message, HttpStatus.INTERNAL_SERVER_ERROR, error);
  }
}

export async function getLogs(
  pipelinePath: string,
  blockId: string,
): Promise<string> {
  const logsPath = path.join(pipelinePath, blockId, "logs.txt");

  if (!(await fileExists(logsPath))) {
    return "Logs not yet available";
  }

  try {
    return await fs.readFile(logsPath, "utf8");
  } catch (error: any) {
    const message = `Failed to read logs from: ${logsPath}`;
    logger.error(error, message);
    throw new ServerError(message, HttpStatus.INTERNAL_SERVER_ERROR, error);
  }
}
