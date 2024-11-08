import path from "path";
import fs from "fs";
import { syncS3ToLocalDirectory } from "./s3";
import { cacheJoin } from "./cache";

export async function syncExecutionResults(
  resultPath,
  pipelineUuid,
  executionUuid,
  anvilConfiguration,
  Merkle,
) {
  let parse_Merkle;
  try {
    Merkle = JSON.parse(Merkle);
    parse_Merkle = true;
  } catch (err) {
    // console.log(err)
    parse_Merkle = false;
  }

  let s3Prefix;
  if (anvilConfiguration.anvil.token) {
    const data = atob(anvilConfiguration.anvil.token.split(".")[1]);
    const org = JSON.parse(data).sub;
    s3Prefix = `${org}/${pipelineUuid}/${executionUuid}`;
  } else {
    s3Prefix = `${pipelineUuid}/${executionUuid}`;
  }

  const localPath = path.join(resultPath, "history", executionUuid, "files");
  await syncS3ToLocalDirectory(s3Prefix, localPath, anvilConfiguration); // That is for downloading history folder and it's contents.

  if (parse_Merkle) {
    // for downloading files
    for (const blockKey in Merkle.blocks) {
      const block = Merkle.blocks[blockKey];
      const blockPath = localPath.split("history")[0];
      const blockName = blockKey.split("-").slice(0, -1).join("-");

      for (const file of block.files.children) {
        const blocksS3Prefix = `${blockName}-${block.hash}-build/${file.path}`;

        await syncS3ToLocalDirectory(
          blocksS3Prefix,
          blockPath,
          anvilConfiguration,
        );

        const oldPath = path.join(blockPath, blocksS3Prefix);
        const newDir = path.join(blockPath, blockKey);

        if (!fs.existsSync(newDir)) {
          fs.mkdirSync(newDir, { recursive: true }); // Create the directory recursively if it doesn't exist
        }

        const newPath = path.join(newDir, file.path);

        try {
          // try to move to block folder.
          await fs.promises.rename(oldPath, newPath);
        } catch (err) {
          console.error("Error moving the file:", err);
        }
        const directory_path = path.join(
          blockPath,
          `${blockName}-${block.hash}-build`,
        );
        try {
          // console.log("directoryPath:", directory_path)
          await fs.promises.rmdir(directory_path);
        } catch (err) {
          console.error("Error removing directory:", err);
        }
      }
    }
  }
  const cachePath = cacheJoin(pipelineUuid, "history", executionUuid, "files");

  if (cachePath != localPath) {
    await syncS3ToLocalDirectory(s3Prefix, cachePath, anvilConfiguration);
  }
}
