import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

async function computeFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

async function readDirectoryRecursively(dirPath, parentRelativePath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const children = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const nodeRelativePath = path.join(parentRelativePath, entry.name);

    if (entry.isDirectory()) {
      const subDirNode = await readDirectoryRecursively(fullPath, nodeRelativePath);
      children.push(subDirNode);
    } else {
      const fileHash = await computeFileHash(fullPath);
      children.push({ path: nodeRelativePath, hash: fileHash });
    }
  }

  const merkle = computeMerkleTree(children);
  return { path: parentRelativePath, hash: merkle, children: children };
}

function computeMerkleTree(nodes) {
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0].hash;

  const parentNodes = [];
  for (let i = 0; i < nodes.length; i += 2) {
    const leftChild = nodes[i];
    const rightChild = i + 1 < nodes.length ? nodes[i + 1] : leftChild;
    const combinedHash = crypto
      .createHash("sha256")
      .update(leftChild.hash + rightChild.hash)
      .digest("hex");
    parentNodes.push({ hash: combinedHash });
  }

  return computeMerkleTree(parentNodes);
}

function combineChildrenHashes(node) {
  return combineHashes(Object.entries(node).map((e) => e.hash))
}
function combineHashes(hashes) {
  if (hashes.length === 0) return null;
  const concatenatedHashes = hashes.join("");
  const combinedHash = crypto
    .createHash("sha256")
    .update(concatenatedHashes)
    .digest("hex");
  return combinedHash;
}

async function computeMerkleTreeForDirectory(dirPath) {
  const files = await readDirectoryRecursively(dirPath, "");
  return files;
}

export async function getPipelineMerkleTree(specs, pipelinePath) {
  const tree = {};

  for (let key in specs.pipeline) {
    tree[key] = {};
    await merkleHash(tree[key], specs.pipeline[key], pipelinePath, key);
  }
  tree.hash = combineChildrenHashes(tree);

  return tree;
}

async function merkleHash(node, block, pipelinePath, blockKey) {
  if (block.action.pipeline) {
    for (let key in block.action.pipeline) {
      node[key] = {};
      await merkleHash(node[key], block.action.pipeline[key], pipelinePath, key);
    }
    node.hash = combineChildrenHashes(node);
  } else if (block.action.container) {
    const blockPath = path.join(pipelinePath, blockKey);
    node.files = await computeMerkleTreeForDirectory(blockPath);
    node.hash = node.files.hash;
  }
}
