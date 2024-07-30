import { z } from "zod";

export const anvilConfigurationSchema = z.object({
  name: z.string(),
  anvil: z.object({
    host: z.string(),
    port: z.string(),
  }),
  s3: z.object({
    host: z.string(),
    port: z.string(),
    region: z.string(),
    bucket: z.string(),
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
  }),
});
