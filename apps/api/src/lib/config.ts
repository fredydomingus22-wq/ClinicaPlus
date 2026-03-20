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
  TENANT_BASE_DOMAIN: z.string().min(3).optional(),
  USE_MOCK_REDIS: z.string().optional().transform(v => v === 'true'),
  RESEND_API_KEY: z.string().min(1),
  REDIS_URL: z.string().min(1), // redis:// ou rediss:// (TLS) — Zod url() rejeita estes protocolos
  METRICS_TOKEN: z.string().min(8),
  ALERT_EMAIL: z.string().email(),
  // WhatsApp & Evolution API
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  EVOLUTION_WEBHOOK_SECRET: z.string().min(1),
  // n8n
  N8N_BASE_URL: z.string().url(),
  N8N_API_KEY: z.string().min(1),
  API_PUBLIC_URL: z.string().url(),
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
