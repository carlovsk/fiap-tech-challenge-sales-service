import dotenv from 'dotenv';
import z from 'zod';

dotenv.config();

export const env = z
  .object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number(),
  })
  .parse(process.env);
