import { execFile, spawnSync } from "child_process";
import { app } from "electron";
import fs from "fs/promises";
import path from "path";
import { BLOCK_SPECS_FILE_NAME } from "../src/utils/constants";
import { fileExists } from "./fileSystem";
import { logger } from "./logger";
import { HttpStatus, ServerError } from "./serverError";
import directoryTree from "directory-tree";

export async function compileComputation(blockPath) {
  const sourcePath = path.join(blockPath, "computations.py");
  const source = await fs.readFile(sourcePath, { encoding: "utf8" });

  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, "resources", "compileComputation.py")
    : path.join("resources", "compileComputation.py");
  if (!(await fileExists(scriptPath))) {
    throw new ServerError(
      `Could not find script for compilation: ${scriptPath}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const { stdout, stderr, status, error } = spawnSync("python", [scriptPath], {
    input: source,
    encoding: "utf8",
  });

  if (error) {
    logger.error(error, buildCompilationErrorLog(blockPath, scriptPath));
    throw buildCompilationServerError();
  }

  if (status != 0) {
    logger.error(buildCompilationErrorLog(blockPath, scriptPath));
    logger.error(stderr);
    throw buildCompilationServerError();
  }

  const io = JSON.parse(stdout);
  return io;
}

export async function saveBlockSpecs(blockPath, specs) {
  const specsPath = path.join(blockPath, BLOCK_SPECS_FILE_NAME);

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

export async function runTest(blockPath, blockKey) {
  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, "resources", "run_test.py")
    : path.join("resources", "run_test.py");
  if (!(await fileExists(scriptPath))) {
    throw new Error(`Could not find script for running tests: ${scriptPath}`);
  }

  return new Promise((resolve, reject) => {
    execFile(
      "python",
      [scriptPath, blockPath, blockKey],
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }

        logger.debug(stdout);
        logger.error(stderr);
        resolve();
      },
    );
  });
}

function buildCompilationErrorLog(blockPath, scriptPath) {
  return `compilation failed for block \nblock path: ${blockPath} \nscript path: ${scriptPath}`;
}

function buildCompilationServerError(error) {
  return new ServerError(
    `Failed to compile code for the block`,
    HttpStatus.INTERNAL_SERVER_ERROR,
    error,
  );
}

export async function getDirectoryTree(pipelineId, blockId) {
  const blockDirectory = path.join(
    process.cwd(),
    ".cache",
    pipelineId,
    blockId,
  );

  const result = directoryTree(blockDirectory);
  return result;
}
