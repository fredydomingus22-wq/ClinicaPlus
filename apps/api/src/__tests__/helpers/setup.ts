// Runs before all tests — global test environment setup
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.METRICS_TOKEN = process.env.METRICS_TOKEN || 'test-metrics-token-min-8-chars';
process.env.ALERT_EMAIL = process.env.ALERT_EMAIL || 'test@example.com';

import { vi } from 'vitest';

// Silence logger in tests — mock must include child() for pino-http compatibility
const createMockLogger = (): Record<string, unknown> => {
  const mock: Record<string, unknown> = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    silent: vi.fn(),
    level: 'silent',
    levels: {
      values: { fatal: 60, error: 50, warn: 40, info: 30, debug: 20, trace: 10 },
      labels: { '10': 'trace', '20': 'debug', '30': 'info', '40': 'warn', '50': 'error', '60': 'fatal' }
    },
    isLevelEnabled: vi.fn().mockReturnValue(false),
    child: vi.fn().mockImplementation(() => createMockLogger()),
  };
  return mock;
};

vi.mock('../../lib/logger', () => ({
  logger: createMockLogger(),
}));

vi.mock('bullmq', () => ({
  Queue: class {
    add = vi.fn().mockResolvedValue({ id: 'mock-job-id' });
    remove = vi.fn().mockResolvedValue(true);
    getJob = vi.fn().mockResolvedValue(null);
    close = vi.fn().mockResolvedValue(undefined);
    on = vi.fn();
  },
}));

vi.mock('../../lib/redis', () => ({
  redis: {
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
  },
  redisSub: {
    quit: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
  },
}));

// Ensure test DB env vars are set
if (!process.env.DATABASE_URL) {
  throw new Error('TEST: DATABASE_URL is not set. Use the test Supabase project.');
}

import { afterAll } from 'vitest';
import { prisma } from '../../lib/prisma';

afterAll(async () => {
  await prisma.$disconnect();
});
