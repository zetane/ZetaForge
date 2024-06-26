export default {
  s3: {
    host: import.meta.env.VITE_S3_HOST,
    port: import.meta.env.VITE_S3_PORT,
    region: "us-east-2",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    forcePathStyle: true,
    bucket: import.meta.env.VITE_BUCKET,
  },
  anvil: {
    host: import.meta.env.VITE_ANVIL_HOST,
    port: import.meta.env.VITE_ANVIL_PORT,
  },
  logger: {
    level: import.meta.env.VITE_LOG_LEVEL,
    pretty: import.meta.env.VITE_LOG_PRETTY,
  },
};
