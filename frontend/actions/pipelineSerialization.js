"use server";

import {
  fileExists,
  filterDirectories,
  readJsonToObject,
  withFileSystemRollback,
} from "@/utils/fileSystem";
import { setDifference } from "@/utils/set";
import fs from "fs/promises";
import path from "path";

const MY_PIPELINES = "my_pipelines";
const BLOCKS = "blocks";
const MY_BLOCKS = "my_blocks";
const BLOCK_SPECS = "specs_v1.json";

const workspace = path.join(process.cwd(), "..");
const myPipelinesDirectory = path.join(workspace, MY_PIPELINES);
const blockLibraryDirectories = [
  path.join(workspace, BLOCKS),
  path.join(workspace, MY_BLOCKS),
];

export async function savePipeline(pipelineSpecs, pipelineName) {
  const pipeline_specs = pipelineName + ".json";
  const pipelineDirectory = path.join(myPipelinesDirectory, pipelineName);
  const pipelineSpecsPath = path.join(pipelineDirectory, pipeline_specs);

  const blockIndex = await getBlockIndex(blockLibraryDirectories);
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
