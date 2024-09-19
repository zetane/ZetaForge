import { app } from "electron";
import fs from "fs/promises";
import path from "path";
import process from "process";
import {
  BLOCK_SPECS_FILE_NAME,
  PIPELINE_SPECS_FILE_NAME,
} from "../src/utils/constants";
import { setDifference } from "../utils/set.js";
import {
  fileExists,
  filterDirectories,
  readJsonToObject,
} from "./fileSystem.js";
import { checkAndUpload, checkAndCopy, uploadDirectory } from "./s3.js";
import {
  createExecution,
  getBuildContextStatus,
  getPipelinesByUuid,
} from "./anvil";
import { logger } from "./logger";
import { computeMerkleTreeForDirectory } from "./merkle.js";

export async function saveSpec(spec, writePath) {
  const pipelineSpecsPath = path.join(writePath, PIPELINE_SPECS_FILE_NAME);
  await fs.mkdir(writePath, { recursive: true });
  await fs.writeFile(pipelineSpecsPath, JSON.stringify(spec, null, 2));
}

export async function saveBlock(blockKey, blockSpec, fromPath, toPath) {
  const newFolder = path.join(toPath, blockKey);
  logger.debug(`saving ${blockKey} from ${fromPath} to ${newFolder}`);
  await fs.mkdir(newFolder, { recursive: true });
  await fs.cp(fromPath, newFolder, { recursive: true });
  await fs.writeFile(
    path.join(newFolder, BLOCK_SPECS_FILE_NAME),
    JSON.stringify(blockSpec, null, 2),
  );
  return newFolder;
}

//added a helper function to know if a block is a parameter block
function hasParameter(blockSpec) {
  return blockSpec && blockSpec.action && blockSpec.action.parameters;
}

function hasContainer(blockSpec) {
  return blockSpec.action.container || blockSpec.action.pipeline;
}

export async function copyPipeline(pipelineSpecs, fromDir, toDir) {
  const bufferPath = path.resolve(process.cwd(), fromDir);

  // Takes existing pipeline + spec
  const writePipelineDirectory = toDir;
  const pipelineSpecsPath = path.join(
    writePipelineDirectory,
    PIPELINE_SPECS_FILE_NAME,
  );

  const fromBlockIndex = await getBlockIndex([bufferPath]);

  let toBlockIndex = {};
  if (await fileExists(writePipelineDirectory)) {
    toBlockIndex = await getBlockIndex([writePipelineDirectory]);
  } else {
    await fs.mkdir(writePipelineDirectory, { recursive: true });
  }

  // Gets pipeline specs from the specs coming from the graph
  // Submitted by the client
  const newPipelineBlocks = getPipelineBlocks(pipelineSpecs);
  const existingPipelineBlocks = (await fileExists(pipelineSpecsPath))
    ? await readPipelineBlocks(pipelineSpecsPath)
    : new Set();

  for (const key of Array.from(newPipelineBlocks)) {
    const newBlockPath = path.join(writePipelineDirectory, key);
    let existingBlockPath = fromBlockIndex[key];
    const blockSpec = pipelineSpecs.pipeline[key];
    if (!existingBlockPath) {
      // NOTE: BAD KEY
      // At a certain point we serialized non unique keys
      // for folder names so there's a chance that we will
      // fail to find the correct key and need to fall back
      // to fetching a common folder name

      existingBlockPath = fromBlockIndex[blockSpec.information.id];
    }
    if (!existingBlockPath) {
      // If we still can't find a path
      // we try to fall back to the block source path
      existingBlockPath = blockSpec.information.block_source;
      if (app.isPackaged) {
        existingBlockPath = path.join(process.resourcesPath, existingBlockPath);
      }
    }

    if (existingBlockPath != newBlockPath) {
      // if it's the same folder, don't try to copy it
      await fs.cp(existingBlockPath, newBlockPath, { recursive: true });
      await fs.writeFile(
        path.join(newBlockPath, BLOCK_SPECS_FILE_NAME),
        JSON.stringify(blockSpec, null, 2),
      );
    }
  }

  await fs.writeFile(pipelineSpecsPath, JSON.stringify(pipelineSpecs, null, 2));

  return { specs: PIPELINE_SPECS_FILE_NAME, dirPath: writePipelineDirectory };
}

async function getBlockIndex(blockDirectories) {
  const blockIndex = {};
  for (const directory of blockDirectories) {
    try {
      const blockPaths = await getBlocksInDirectory(directory);
      for (const blockPath of blockPaths) {
        const normPath = path.normalize(blockPath);
        const blockId = normPath.split(path.sep).pop();
        blockIndex[blockId] = blockPath;
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        const message = `Directory or file does not exist: ${error.path}`;
        logger.error(error, message);
      } else {
        // Handle other types of errors or rethrow the error
        throw error;
      }
    }
  }
  return blockIndex;
}

function getPipelineBlocks(pipelineSpecs) {
  const blocks = new Set();
  const pipeline = pipelineSpecs.pipeline;
  for (const [key, block] of Object.entries(pipeline)) {
    if (hasContainer(block) && !hasParameter(block)) {
      blocks.add(key);
    }
  }
  return blocks;
}

async function getBlocksInDirectory(directory) {
  const files = await fs.readdir(directory);
  const filePaths = files.map((b) => path.join(directory, b));
  const directories = await filterDirectories(filePaths);

  return directories;
}

async function readPipelineBlocks(specsPath) {
  const specs = await readJsonToObject(specsPath);
  return getPipelineBlocks(specs);
}

export async function removeBlock(blockId, pipelinePath) {
  const blockPath = await getPipelineBlockPath(pipelinePath, blockId);
  fs.rm(blockPath, { recursive: true });
}

export async function getPipelineBlockPath(pipelinePath, blockId) {
  const blockPaths = await getBlocksInDirectory(pipelinePath);

  for (const blockPath of blockPaths) {
    const id = blockPath.split(path.sep).pop();
    if (blockId == id) {
      return blockPath;
    }
  }
}

export async function executePipeline(
  id,
  executionId,
  specs,
  pipelinePath,
  name,
  rebuild,
  anvilHostConfiguration,
) {
  specs = await uploadBlocks(
    id,
    executionId,
    specs,
    pipelinePath,
    anvilHostConfiguration,
  );
  specs["sink"] = pipelinePath;
  specs["build"] = pipelinePath;
  specs["name"] = name;
  specs["id"] = id;

  //const merkle = await computeMerkleTreeForDirectory(path);
  //const pipelines = await getPipelinesByUuid(anvilHostConfiguration, id);

  await uploadBuildContexts(
    anvilHostConfiguration,
    specs,
    pipelinePath,
    rebuild,
  );

  return await createExecution(
    anvilHostConfiguration,
    executionId,
    specs,
    rebuild,
  );
}

async function uploadBlocks(
  pipelineId,
  executionId,
  pipelineSpecs,
  blockPath,
  anvilConfiguration,
) {
  const nodes = pipelineSpecs.pipeline;
  for (const nodeId in nodes) {
    const node = nodes[nodeId];

    const parameters = node.action?.parameters;
    const container = node.action?.container;

    if (parameters) {
      for (const paramKey in parameters) {
        const param = parameters[paramKey];

        if (param.type === "file" || param.type == "fileLoad") {
          const filePath = param.value;
          const fileName = path.basename(filePath);
          const awsKey = `${pipelineId}/${executionId}/${fileName}`;

          if (filePath && filePath.trim()) {
            await checkAndUpload(awsKey, filePath, anvilConfiguration);
            param.value = `"${fileName}"`;
            param.type = "blob";
          }
        } else if (param.type == "blob") {
          const copyKey = param.value;
          const fileName = param.value.split("/").at(-1);
          const newAwsKey = `${pipelineId}/${executionId}/${fileName}`;

          await checkAndCopy(newAwsKey, copyKey, anvilConfiguration);
          param.value = `"${fileName}"`;
        }
      }
    } else if (container) {
      const computationFile = path.join(
        blockPath,
        "/",
        nodeId,
        "/computations.py",
      );
      const awsKey = `${pipelineId}/${executionId}/${nodeId}.py`;
      await checkAndUpload(awsKey, computationFile, anvilConfiguration);
    }
  }
  return pipelineSpecs;
}

async function uploadBuildContexts(
  configuration,
  pipelineSpecs,
  buildPath,
  rebuild,
) {
  const buildContextStatuses = await getBuildContextStatus(
    configuration,
    pipelineSpecs,
    rebuild,
  );
  await Promise.all(
    buildContextStatuses
      .filter((status) => !status.isUploaded)
      .map((status) => [path.join(buildPath, status.blockKey), status.s3Key])
      .map(([blockPath, s3Key]) =>
        uploadDirectory(s3Key, blockPath, configuration),
      ),
  );
}
