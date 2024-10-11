import {
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";
import { S3SyncClient } from "s3-sync-client";
import config from "../config";
import { getDirectoryFilesRecursive } from "./fileSystem";
import { logger } from "./logger";

function getClient(configuration) {
  const endpoint = `http://${configuration.s3.host}:${configuration.s3.port}`;
  return new S3Client({
    region: configuration.s3.region,
    credentials: {
      accessKeyId: configuration.s3.accessKeyId,
      secretAccessKey: configuration.s3.secretAccessKey,
    },
    endpoint: endpoint,
    forcePathStyle: config.s3.forcePathStyle,
  });
}

function getFullS3Key(key, configuration) {
  if (configuration.anvil.token) {
    const data = atob(configuration.anvil.token.split(".")[1]);
    return JSON.parse(data).sub + "/" + key;
  } else {
    return key;
  }
}

export async function checkAndCopy(newKey, copyKey, anvilConfiguration) {
  const oldExists = await fileExists(copyKey, anvilConfiguration);
  if (!oldExists) {
    throw new Error(
      "Previous file did not upload successfully, please upload a new file.",
    );
  }
  const exists = await fileExists(newKey, anvilConfiguration);
  if (!exists) {
    await copy(newKey, copyKey, anvilConfiguration);
  }
}

async function copy(newKey, copyKey, anvilConfiguration) {
  const client = getClient(anvilConfiguration);
  const source = encodeURI(
    `/${anvilConfiguration.s3.bucket}/${getFullS3Key(copyKey, anvilConfiguration)}`,
  );
  try {
    const res = await client.send(
      new CopyObjectCommand({
        Bucket: anvilConfiguration.s3.bucket,
        CopySource: source,
        Key: getFullS3Key(newKey, anvilConfiguration),
      }),
    );

    return res;
  } catch (err) {
    const message = `Could not copy file in S3 from ${source} to ${getFullS3Key(newKey, anvilConfiguration)}`;
    logger.error(err, message);
    logger.error(message, err, err?.stack);
    throw new Error(message);
  }
}

export async function checkAndUpload(key, filePath, anvilConfiguration) {
  const exists = await fileExists(key, anvilConfiguration);

  if (!exists) {
    await upload(key, filePath, anvilConfiguration);
  }
}

export async function uploadDirectory(key, diretoryPath, anvilConfiguration) {
  const files = await getDirectoryFilesRecursive(diretoryPath);
  await Promise.all(
    files.map((f) =>
      upload(
        `${key}/${f.replace(path.sep, "/")}`,
        path.join(diretoryPath, f),
        anvilConfiguration,
      ),
    ),
  );
}

async function upload(key, filePath, anvilConfiguration) {
  const client = getClient(anvilConfiguration);

  try {
    const fileBody = await fs.readFile(filePath);
    const res = await client.send(
      new PutObjectCommand({
        Bucket: anvilConfiguration.s3.bucket,
        Key: getFullS3Key(key, anvilConfiguration),
        Body: fileBody,
      }),
    );
    return res;
  } catch (err) {
    const message = "Could not upload file to S3";
    logger.error(message, err, err.stack);
    throw new Error(message);
  }
}

async function fileExists(key, anvilConfiguration) {
  const client = getClient(anvilConfiguration);

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: anvilConfiguration.s3.bucket,
        Key: getFullS3Key(key, anvilConfiguration),
      }),
    );
    return true;
  } catch (err) {
    if (err.name === "NotFound" || err.name === "403") {
      return false;
    }
    const message = "Error checking file existence in S3";
    logger.error(err, message);
    throw new Error(message);
  }
}

export async function getFileData(key, anvilConfiguration) {
  const exists = await fileExists(key, anvilConfiguration);
  const client = getClient(anvilConfiguration);

  if (exists) {
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: anvilConfiguration.s3.bucket,
          Key: getFullS3Key(key, anvilConfiguration),
        }),
      );

      const fileData = await response.Body.transformToString();
      return fileData;
    } catch (err) {
      const message = "Could not retrieve file from S3";
      logger.error(message, err);
      throw new Error(message);
    }
  } else {
    logger.debug(`File with key ${key} does not exist in S3`);
    return null;
  }
}

export async function getFile(key, destinationPath, anvilConfiguration) {
  const client = getClient(anvilConfiguration);
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: anvilConfiguration.s3.bucket,
        Key: getFullS3Key(key, anvilConfiguration),
      }),
    );

    const fileStream = fs.createWriteStream(destinationPath);
    response.Body.pipe(fileStream);

    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    logger.debug(`File downloaded successfully to ${destinationPath}`);
  } catch (err) {
    const message = "Could not download file from S3";
    logger.error(message, err);
    throw new Error(message);
  }
}

export async function syncS3ToLocalDirectory(
  s3Prefix,
  localPath,
  anvilConfiguration,
) {
  const client = getClient(anvilConfiguration);
  const { sync } = new S3SyncClient({ client: client });

  const s3Path = `s3://${anvilConfiguration.s3.bucket}/${s3Prefix}`;
  await sync(s3Path, localPath);
}
