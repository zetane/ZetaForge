import path from "path";
import { syncS3ToLocalDirectory } from "./s3";

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
}
