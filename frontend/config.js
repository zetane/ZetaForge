export default {
  s3: {
    region: "us-east-2",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    // note: using `localhost` in the endpoint caused a connection refused error
    // because the s3client defaults to using ipv6
    endpoint: import.meta.env.VITE_S3_ENDPOINT,
    forcePathStyle: true,
    bucket: import.meta.env.VITE_BUCKET
  }
}