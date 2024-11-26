import path from "path";
import fs from "fs";
import { syncS3ToLocalDirectory } from "./s3";
import { cacheJoin } from "./cache";

export async function syncExecutionResults(
  resultPath,
  pipelineUuid,
  executionUuid,
  anvilConfiguration,
  merkle,
  spec,
) {
  let s3Prefix;
  let org;
  if (anvilConfiguration.anvil.token) {
    const data = atob(anvilConfiguration.anvil.token.split(".")[1]);
    org = JSON.parse(data).sub;
    s3Prefix = `${org}/${pipelineUuid}/${executionUuid}`;
  } else {
    s3Prefix = `${pipelineUuid}/${executionUuid}`;
  }

  const localPath = path.join(resultPath, "history", executionUuid, "files");
  await syncS3ToLocalDirectory(s3Prefix, localPath, anvilConfiguration); // That is for downloading history folder and it's contents.

  if (merkle != null && merkle != "undefined" && merkle != "") {
    try {
      const merkle_persed = JSON.parse(merkle);
      try {
        // for downloading files
        for (const blockKey in merkle_persed.blocks) {
          const blockSpec = spec[blockKey];
          if (!org || !blockSpec?.action?.container?.image) {
            continue;
          }
          const block = merkle_persed.blocks[blockKey];
          const blockPath = localPath.split("history")[0];
          const blocksS3Prefix = `${org}/${blockSpec?.action?.container?.image}-${block.hash}-build`;
          const localBlockDir = path.join(blockPath, blockKey);

          if (!fs.existsSync(localBlockDir)) {
            // directory creeation
            fs.mkdirSync(localBlockDir, { recursive: true });
          }

          console.log(`syncing ${localBlockDir} block ${blocksS3Prefix}`);

          try {
            await syncS3ToLocalDirectory(
              blocksS3Prefix,
              localBlockDir,
              anvilConfiguration,
            );
            // console.log(`Downloaded folder: ${blocksS3Prefix} to ${localBlockDir}`);
          } catch (err) {
            console.error("Error downloading the folder:", err);
          }
        }
      } catch (err) {
        console.error("Error downloading files:", err);
      }
    } catch (err) {
      console.error("Error parsing merkle:", err);
    }
  }
  const cachePath = cacheJoin(pipelineUuid, "history", executionUuid, "files");

  if (cachePath != localPath) {
    await syncS3ToLocalDirectory(s3Prefix, cachePath, anvilConfiguration);
  }
}
