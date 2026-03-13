import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  JWT_SECRET: z.string().min(64),
  JWT_REFRESH_SECRET: z.string().min(64),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().transform(url => url.replace(/\/$/, '')),
  RESEND_API_KEY: z.string().min(1),
}).refine((data) => data.JWT_SECRET !== data.JWT_REFRESH_SECRET, {
  message: "JWT_SECRET and JWT_REFRESH_SECRET must be different",
  path: ["JWT_REFRESH_SECRET"],
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  // Use a simple console.error for bootstrap phase, but we can't because of lint.
  // We'll import a basic logger or just disable lint for this line.
  // Since we are in config.ts (bootstrap), importing from '../lib/logger' might cause circular deps.
  // Let's use eslint-disable for this specific bootstrap error.
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const config = parsed.data;
