import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

//TODO could use more refactoring
export async function computePipelineMerkleTree(specs, pipelinePath) {
  return merklePipeline(specs.pipeline, pipelinePath);
}

async function merklePipeline(pipeline, pipelinePath) {
  const node = {
    blocks: {},
  };

  for (let key in pipeline) {
    const childBlock = pipeline[key];
    if (hasPipeline(childBlock)) {
      node.blocks[key] = await merklePipeline(childBlock.action.pipeline, pipelinePath);
    } else if (hasContainer(childBlock)) {
      const blockPath = path.join(pipelinePath, key);
      const directoryMerkle = await computeDirectoryMerkleTree(blockPath)
      node.blocks[key] = {
        files: directoryMerkle,
        hash: directoryMerkle.hash
      }
    }
  }

  node.hash = combineChildrenHashes(Object.values(node.blocks));
  return node;
}

function hasContainer(block) {
  return block?.action?.container?.image?.length > 0;
}

function hasPipeline(block) {
  return Object.keys(block?.action?.pipeline ?? {}).length > 0;
}

async function computeDirectoryMerkleTree(dirPath) {
  const files = await merkleDirectory(dirPath, "");
  return files;
}

async function merkleDirectory(dirPath, parentRelativePath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const children = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const nodeRelativePath = path.join(parentRelativePath, entry.name);

    if (entry.isDirectory()) {
      const subDirNode = await merkleDirectory(fullPath, nodeRelativePath);
      children.push(subDirNode);
    } else {
      const fileHash = await computeFileHash(fullPath);
      children.push({ path: nodeRelativePath, hash: fileHash });
    }
  }

  const hash = combineChildrenHashes(children);
  return { path: parentRelativePath, hash: hash, children: children };
}

async function computeFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

function combineChildrenHashes(nodes) {
  return combineHashes(nodes.map((e) => e.hash));
}

function combineHashes(hashes) {
  const concatenatedHashes = hashes.join("");
  const combinedHash = crypto
    .createHash("sha256")
    .update(concatenatedHashes)
    .digest("hex");
  return combinedHash;
}
