import fs from "fs/promises";
import path from "path";
import process from "process";
import { setDifference } from "../utils/set.js";
import {
  fileExists,
  filterDirectories,
  readJsonToObject,
  withFileSystemRollback,
} from "./fileSystem.js";

const BLOCK_SPECS = "specs_v1.json";

export async function saveBlock(blockSpecs, blockId, fromPath, toPath) {
  const newFolder = path.join(toPath, blockSpecs.information.id+"-"+blockId)
  const existingBlock = path.join(fromPath, blockSpecs.information.id)
  withFileSystemRollback([toPath], async () => {
    await fs.mkdir(newFolder, { recursive: true });
    await fs.cp(existingBlock, newFolder, { recursive: true });
  })
  return newFolder;
}

export async function copyPipeline(pipelineSpecs, pipelineName, fromDir, toDir) {
  const pipeline_specs = pipelineName + ".json";
  const bufferPath = path.resolve(process.cwd(), fromDir)

  // Takes existing pipeline + spec
  const pipelineDirectory = toDir;
  const pipelineSpecsPath = path.join(pipelineDirectory, pipeline_specs);

  const blockIndex = await getBlockIndex([bufferPath]);
  const pipelineBlockIndex = (await fileExists(pipelineDirectory))
    ? await getBlockIndex([pipelineDirectory])
    : {};

  const newPipelineBlock = getPipelineBlocks(pipelineSpecs);
  const oldPipelineBlocks = (await fileExists(pipelineSpecsPath))
    ? await readPipelineBlocks(pipelineSpecsPath)
    : new Set();

  const blocksToAdd = setDifference(newPipelineBlock, oldPipelineBlocks);
  const blocksToRemove = setDifference(oldPipelineBlocks, newPipelineBlock);

  withFileSystemRollback([pipelineDirectory], async () => {
    await fs.mkdir(pipelineDirectory, { recursive: true });
    for (const block of blocksToAdd) {
      const pipelineBlockPath = path.join(pipelineDirectory, block);
      await fs.cp(blockIndex[block], pipelineBlockPath, { recursive: true });
    }

    for (const block of blocksToRemove) {
      await fs.rm(pipelineBlockIndex[block], { recursive: true });
    }

    await fs.writeFile(
      pipelineSpecsPath,
      JSON.stringify(pipelineSpecs, null, 2)
    );
  });

  return {specs: pipeline_specs, dirPath: pipelineDirectory}
}

async function getBlockIndex(blockDirectories) {
  const blockIndex = {};
  for (const directory of blockDirectories) {
    const blockPaths = await getBlocksInDirectory(directory);
    for (const blockPath of blockPaths) {
      const specs = await readJsonToObject(path.join(blockPath, BLOCK_SPECS));
      blockIndex[specs.information.id] = blockPath;
    }
  }
  return blockIndex;
}

function getPipelineBlocks(pipelineSpecs) {
  return new Set(
    Object.keys(pipelineSpecs.pipeline)
      .map((k) => pipelineSpecs.pipeline[k])
      .map((b) => b.information.id)
      .map((id) => id.substring(0, id.lastIndexOf("-")))
  );
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
  withFileSystemRollback([blockPath], () => {
    fs.rm(blockPath, { recursive: true });
  });
}

export async function getBlockPath(blockId, pipelinePath) {
  return await getPipelineBlockPath(pipelinePath, blockId);
}

export async function getPipelineBlockPath(pipelinePath, blockId) {
  const blockPaths = await getBlocksInDirectory(pipelinePath);

  for (const blockPath of blockPaths) {
    const id = blockPath.split("/").pop().split("-").pop();
    if (blockId == id) {
      return blockPath;
    }
  }
}

