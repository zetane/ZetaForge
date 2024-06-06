import { HeadObjectCommand, PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from 'fs/promises';
import config from "../config";

const client = new S3Client({
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  },
  endpoint: config.s3.endpoint,
  forcePathStyle: config.s3.forcePathStyle,
})

export async function checkAndUpload(key, filePath) {
  const exists = await fileExists(key);

  if (!exists) {
    await upload(key, filePath);
  }
}
async function upload(key, filePath) {
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

async function fileExists(key) {
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

export async function getFileData(key) {
  const exists = await fileExists(key);

  if (exists) {
    try {
      const response = await client.send(new GetObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      }));

      const fileData = await response.Body.transformToString();
      return fileData;
    } catch (err) {
      const message = 'Could not retrieve file from S3';
      console.error(message, err);
      throw new Error(message);
    }
  } else {
    console.log(`File with key ${key} does not exist in S3`);
    return null;
  }
}

export async function getFile(key, destinationPath) {
  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    }));

    const fileStream = fs.createWriteStream(destinationPath);
    response.Body.pipe(fileStream);

    await new Promise((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    console.log(`File downloaded successfully to ${destinationPath}`);
  } catch (err) {
    const message = 'Could not download file from S3';
    console.error(message, err);
    throw new Error(message);
  }
}
