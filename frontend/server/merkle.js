import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

// Function to compute hash of a file
async function computeFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

// Function to recursively read directory and compute hashes
async function readDirectoryRecursively(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let children = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const subDirChildren = await readDirectoryRecursively(fullPath);
      children = children.concat(subDirChildren);
    } else {
      const fileHash = await computeFileHash(fullPath);
      children.push({ path: fullPath, hash: fileHash });
    }
  }

  return children;
}

// Function to compute Merkle tree
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

// Main function to compute Merkle tree for a directory
export async function computeMerkleTreeForDirectory(dirPath) {
  const files = await readDirectoryRecursively(dirPath);
  const merkleRoot = computeMerkleTree(files);
  return { files, merkleRoot };
}
