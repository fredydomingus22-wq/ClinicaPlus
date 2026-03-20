import { Redis, RedisOptions } from 'ioredis';
import pino from 'pino';
import dotenv from 'dotenv';

dotenv.config();

const logger = pino({ name: 'worker-redis' });

// REDIS_URL must be read after dotenv.config() to ensure env vars are loaded.
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/** Inject TLS options when REDIS_URL uses the rediss:// scheme */
function buildRedisOptions(extraOpts: Partial<RedisOptions> = {}): RedisOptions {
  const isTls = REDIS_URL.startsWith('rediss://');
  return {
    ...(isTls ? { tls: {} } : {}),
    ...extraOpts,
  } as RedisOptions;
}

function createClient() {
  const isDev = process.env.NODE_ENV === 'development';
  const opts = buildRedisOptions({
    maxRetriesPerRequest: null,
    retryStrategy: (t: number) => {
      if (isDev && t > 1) return null; // Fail fast in dev
      return Math.min(t * 200, 2000);
    },
    connectTimeout: 5000,
  });
  // Cast to unknown first to avoid the TS constructor overload tuple bug 
  return new (Redis as unknown as new (url: string, options: RedisOptions) => Redis)(REDIS_URL, opts);
}

export const redis = createClient() as any;

if (redis) {
  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (err: any) => logger.error({ err }, 'Redis connection error'));
}
