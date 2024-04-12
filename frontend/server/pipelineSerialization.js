import { app } from "electron";
import fs from "fs/promises";
import path from "path";
import process from "process";
import { setDifference } from "../utils/set.js";
import {
  fileExists,
  filterDirectories,
  readJsonToObject,
} from "./fileSystem.js";

const BLOCK_SPECS = "specs_v1.json";

export async function saveSpec(spec, writePath, pipelineName) {
  const pipelineSpecsPath = path.join(writePath, pipelineName)
  await fs.mkdir(writePath, { recursive: true });
  await fs.writeFile(
    pipelineSpecsPath,
    JSON.stringify(spec, null, 2)
  );
}

export async function saveBlock(blockKey, fromPath, toPath) {
  const newFolder = path.join(toPath, blockKey)
  console.log(`saving ${blockKey} from ${fromPath} to ${newFolder}`)
  await fs.mkdir(newFolder, { recursive: true });
  await fs.cp(fromPath, newFolder, { recursive: true });
  return newFolder;
}

export async function copyPipeline(pipelineSpecs, pipelineName, fromDir, toDir) {
  const pipeline_specs = pipelineName + ".json";
  const bufferPath = path.resolve(process.cwd(), fromDir)

  console.log(`supposed to be writing from ${fromDir} to ${toDir}`)

  // Takes existing pipeline + spec
  const writePipelineDirectory = toDir;
  const pipelineSpecsPath = path.join(writePipelineDirectory, pipeline_specs);

  const fromBlockIndex = await getBlockIndex([bufferPath]);

  let toBlockIndex = {}
  if (await fileExists(writePipelineDirectory)) {
    toBlockIndex = await getBlockIndex([writePipelineDirectory])
  } else {
    await fs.mkdir(writePipelineDirectory, { recursive: true });
  }

  // Gets pipeline specs from the specs coming from the graph
  // Submitted by the client
  const newPipelineBlocks = getPipelineBlocks(pipelineSpecs);
  const existingPipelineBlocks = (await fileExists(pipelineSpecsPath))
    ? await readPipelineBlocks(pipelineSpecsPath)
    : new Set();

  const blocksToRemove = setDifference(existingPipelineBlocks, newPipelineBlocks);

  for (const key of Array.from(newPipelineBlocks)) {
    const newBlockPath = path.join(writePipelineDirectory, key);
    let existingBlockPath = fromBlockIndex[key]
    if (!existingBlockPath) {
      // NOTE: BAD KEY
      // At a certain point we serialized non unique keys 
      // for folder names so there's a chance that we will
      // fail to find the correct key and need to fall back
      // to fetching a common folder name
      const blockSpec = pipelineSpecs.pipeline[key]
      existingBlockPath = fromBlockIndex[blockSpec.information.id]
    }
    if (!existingBlockPath) {
      // If we still can't find a path
      // we try to fall back to the block source path
      const blockSpec = pipelineSpecs.pipeline[key]
      existingBlockPath = blockSpec.information.block_source
      if(app.isPackaged) {
        existingBlockPath = path.join(process.resourcesPath, existingBlockPath)
      }
    }
    
    console.log(`saving ${key} from ${existingBlockPath} to ${newBlockPath}`)
    if (existingBlockPath != newBlockPath) {
      // if it's the same folder, don't try to copy it
      await fs.cp(existingBlockPath, newBlockPath, {recursive: true})
    }
  }

  for (const block of Array.from(blocksToRemove)) {
    await fs.rm(toBlockIndex[block], { recursive: true });
  }

  await fs.writeFile(
    pipelineSpecsPath,
    JSON.stringify(pipelineSpecs, null, 2)
  );

  return {specs: pipeline_specs, dirPath: writePipelineDirectory}
}

async function getBlockIndex(blockDirectories) {
  const blockIndex = {};
  for (const directory of blockDirectories) {
    try {
      const blockPaths = await getBlocksInDirectory(directory);
      for (const blockPath of blockPaths) {
        const normPath = path.normalize(blockPath)
        const blockId = normPath.split(path.sep).pop()
        blockIndex[blockId] = blockPath;
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error('Directory or file does not exist:', error.path);
      } else {
        // Handle other types of errors or rethrow the error
        throw error;
      }
    }
  }
  return blockIndex;
}

function getPipelineBlocks(pipelineSpecs) {
  const blocks = new Set()
  const pipeline = pipelineSpecs.pipeline
  for (const [key, block] of Object.entries(pipeline)) {
    if (block.action.container || block.action.pipeline) {
      blocks.add(key)
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

export async function getBlockPath(blockId, pipelinePath) {
  return await getPipelineBlockPath(pipelinePath, blockId);
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
