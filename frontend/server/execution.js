import path from "path";
import { syncS3ToLocalDirectory } from "./s3";

export async function syncExecutionResults(
  s3Prefix,
  sink,
  executionUuid,
  anvilConfiguration,
) {
  const localPath = path.join(sink, "history", executionUuid);

  await syncS3ToLocalDirectory(s3Prefix, localPath, anvilConfiguration);
}
