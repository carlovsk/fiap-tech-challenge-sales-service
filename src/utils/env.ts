import dotenv from 'dotenv';
import z from 'zod';

dotenv.config();

export const env = z
  .object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number(),
    MANAGEMENT_SERVICE_URL: z.string().url(),
  })
  .parse(process.env);
