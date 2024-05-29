import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from 'fs/promises';
import config from "../config";

function getClient(configuration) {
  const endpoint = `http://${configuration.host}:${configuration.s3Port}`;
  console.log(endpoint);
  return new S3Client({
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey
    },
    endpoint: endpoint,
    forcePathStyle: config.s3.forcePathStyle,
  })
}

export async function checkAndUpload(key, filePath, anvilConfiguration) {
  const exists = await fileExists(key, anvilConfiguration);

  if (!exists) {
    await upload(key, filePath, anvilConfiguration);
  }
}
async function upload(key, filePath, anvilConfiguration) {
  const client = getClient(anvilConfiguration);
  const fileBody = await fs.readFile(filePath)

  try {
    const res = await client.send(new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: fileBody,
    }))
    return res
  } catch (err) {
    const message = 'Could not upload file to S3';
    console.error(message, err);
    throw new Error(message);
  }
}

async function fileExists(key, anvilConfiguration) {
  const client = getClient(anvilConfiguration);

  try {
    await client.send(new HeadObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    }));
    return true;
  } catch (err) {
    if (err.name === 'NotFound') {
      return false;
    }
    const message = 'Error checking file existence in S3';
    console.error(message, err);
    throw new Error(message);
  }
}

