import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULTS_TEST = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/clinicaplus_test',
  DIRECT_URL: 'postgresql://test:test@localhost:5432/clinicaplus_test',
  FRONTEND_URL: 'http://localhost:5173',
  JWT_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  JWT_REFRESH_SECRET: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
  RESEND_API_KEY: 're_test_placeholder',
  REDIS_URL: 'redis://localhost:6379',
  METRICS_TOKEN: 'test-metrics-token-min-8-chars',
  ALERT_EMAIL: 'test@example.com',
  EVOLUTION_API_URL: 'http://localhost:8080',
  EVOLUTION_API_KEY: 'test',
  EVOLUTION_WEBHOOK_SECRET: 'test',
  N8N_BASE_URL: 'http://localhost:5678',
  N8N_API_KEY: 'test',
  API_PUBLIC_URL: 'http://localhost:3001',
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_SERVICE_ROLE_KEY: 'test',
} as const;

function buildConfigSchema(opts: { isTest: boolean }) {
  const maybeDefault = <T extends z.ZodTypeAny>(schema: T, key: keyof typeof DEFAULTS_TEST): T => {
    return (opts.isTest ? schema.default(DEFAULTS_TEST[key]) : schema) as T;
  };

  return z.object({
    DATABASE_URL: maybeDefault(z.string().url(), 'DATABASE_URL'),
    DIRECT_URL: maybeDefault(z.string().url(), 'DIRECT_URL'),
    JWT_SECRET: maybeDefault(z.string().min(64), 'JWT_SECRET'),
    JWT_REFRESH_SECRET: maybeDefault(z.string().min(64), 'JWT_REFRESH_SECRET'),
    PORT: z.coerce.number().default(3001),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    FRONTEND_URL: maybeDefault(z.string().url(), 'FRONTEND_URL').transform(url => url.replace(/\/$/, '')),
    TENANT_BASE_DOMAIN: z.string().min(3).optional(),
    USE_MOCK_REDIS: z.string().optional().transform(v => v === 'true'),
    RESEND_API_KEY: maybeDefault(z.string().min(1), 'RESEND_API_KEY'),
    REDIS_URL: maybeDefault(z.string().min(1), 'REDIS_URL'), // redis:// ou rediss:// (TLS) — Zod url() rejeita estes protocolos
    METRICS_TOKEN: maybeDefault(z.string().min(8), 'METRICS_TOKEN'),
    ALERT_EMAIL: maybeDefault(z.string().email(), 'ALERT_EMAIL'),
    // WhatsApp & Evolution API (Baileys)
    EVOLUTION_API_URL: maybeDefault(z.string().url(), 'EVOLUTION_API_URL'),
    EVOLUTION_API_KEY: maybeDefault(z.string().min(1), 'EVOLUTION_API_KEY'),
    EVOLUTION_WEBHOOK_SECRET: maybeDefault(z.string().min(1), 'EVOLUTION_WEBHOOK_SECRET'),
    // WhatsApp Meta Cloud API
    META_APP_SECRET: z.string().min(8).optional(),      // App Secret — verifica X-Hub-Signature-256
    META_VERIFY_TOKEN: z.string().min(8).optional(),    // Token de verificação do webhook Meta
    META_GRAPH_VERSION: z.string().default('v23.0'),    // Versão da Graph API
    // n8n
    N8N_BASE_URL: maybeDefault(z.string().url(), 'N8N_BASE_URL'),
    N8N_API_KEY: maybeDefault(z.string().min(1), 'N8N_API_KEY'),
    API_PUBLIC_URL: maybeDefault(z.string().url(), 'API_PUBLIC_URL'),
    // Supabase
    SUPABASE_URL: maybeDefault(z.string().url(), 'SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: maybeDefault(z.string().min(1), 'SUPABASE_SERVICE_ROLE_KEY'),
    SUPABASE_LAUDOS_BUCKET: z.string().default('laudos'),
    SUPABASE_PUBLIC_BUCKET: z.string().default('assets'),
    // Typebot integration
    TYPEBOT_VIEWER_URL: z.string().url().default('http://localhost:8082'),
    TYPEBOT_TRIAGEM_FLOW_ID: z.string().default('cp-triagem-bot'),
    STORAGE_PROVIDER: z.enum(['supabase', 'local']).default('local'),
  }).refine((data) => data.JWT_SECRET !== data.JWT_REFRESH_SECRET, {
    message: "JWT_SECRET and JWT_REFRESH_SECRET must be different",
    path: ["JWT_REFRESH_SECRET"],
  });
}

const isTest = (process.env.NODE_ENV ?? 'development') === 'test';
const configSchema = buildConfigSchema({ isTest });
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

export type AppConfig = z.infer<typeof configSchema>;
export const config = parsed.data as AppConfig;
