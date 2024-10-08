import {
  HeadObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import config from "../../config";

function getFullS3Key(key, configuration) {
  if (configuration.anvil.token) {
    const data = atob(configuration.anvil.token.split(".")[1]);
    return JSON.parse(data).sub + "/" + key;
  } else {
    return key;
  }
}

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

async function fileExists(key, anvilConfiguration) {
  const client = getClient(anvilConfiguration);

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.s3.bucket,
        Key: getFullS3Key(key, anvilConfiguration),
      }),
    );
    return true;
  } catch (err) {
    if (err.name === "NotFound") {
      return false;
    }
    const message = "Error checking file existence in S3";
    console.error(message, err);
    throw new Error(message);
  }
}

export async function getS3FileData(key, anvilConfiguration) {
  const exists = await fileExists(key, anvilConfiguration);
  const client = getClient(anvilConfiguration);

  if (exists) {
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: config.s3.bucket,
          Key: getFullS3Key(key, anvilConfiguration),
        }),
      );

      const fileData = await response.Body.transformToString();
      return fileData;
    } catch (err) {
      const message = "Could not retrieve file from S3";
      console.error(message, err);
      throw new Error(message);
    }
  } else {
    const message = `File with key ${key} does not exist in S3`;
    throw new Error(message);
  }
}

export async function getLocalFileData(key) {
  const baseUrl = "http://localhost:3330/result";
  const fullPath = `${baseUrl}/${key}`;

  try {
    const response = await fetch(fullPath);

    if (!response.ok) {
      if (response.status === 404) {
        const message = `File with key ${key} does not exist on localhost:3330`;
        throw new Error(message);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const fileData = await response.text();
    return fileData;
  } catch (err) {
    const message = "Could not retrieve file from localhost:3330";
    console.error(message, err);
    throw new Error(message);
  }
}
