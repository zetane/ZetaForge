export default {
  s3: {
    region: "us-east-2",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    endpoint: import.meta.env.VITE_S3_ENDPOINT,
    forcePathStyle: true,
    bucket: import.meta.env.VITE_BUCKET
  }
}