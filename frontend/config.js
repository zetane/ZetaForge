export default {
  s3: {
    region: "us-east-2",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    port: import.meta.env.VITE_S3_PORT,
    forcePathStyle: true,
    bucket: import.meta.env.VITE_BUCKET
  },
  anvil: {
    host: import.meta.env.VITE_ANVIL_HOST,
    port: import.meta.env.VITE_ANVIL_PORT
  }
}
