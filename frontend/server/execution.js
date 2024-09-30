import path from "path";
import { syncS3ToLocalDirectory } from "./s3";
import { cacheJoin } from "./cache";

export async function syncExecutionResults(
  resultPath,
  pipelineUuid,
  executionUuid,
  anvilConfiguration,
) {
  let s3Prefix;
  if (anvilConfiguration.anvil.token) {
    const data = atob(anvilConfiguration.anvil.token.split(".")[1]);
    const org = JSON.parse(data).sub;
    s3Prefix = `${org}/${pipelineUuid}/${executionUuid}`;
  } else {
    s3Prefix = `${pipelineUuid}/${executionUuid}`;
  }

  const localPath = path.join(resultPath, "history", executionUuid, "files");

  await syncS3ToLocalDirectory(s3Prefix, localPath, anvilConfiguration);

  // TODO: Fix all of this for real
  // This is because if a user loads a pipeline from a folder, we need to keep
  // That folder as the pipeline "path" so that we can reference the blocks
  // And sync the history to the loaded folder for user reference

  // *BUT* we also need to serve the result files of runs
  // whether they are local or remote, which means we need results
  // In a retrievable location
  //
  //
  const cachePath = cacheJoin(pipelineUuid, "history", executionUuid, "files");

  if (cachePath != localPath) {
    await syncS3ToLocalDirectory(s3Prefix, cachePath, anvilConfiguration);
  }
}
