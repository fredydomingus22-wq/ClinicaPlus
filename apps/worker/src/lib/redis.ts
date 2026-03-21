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
      // Aumentar para 20 tentativas em dev para aguentar instabilidade (aprox. 1 minuto de tentativas)
      if (isDev && t > 20) {
        logger.warn('Redis: Limite de tentativas excedido após 20 vezes.');
        return null;
      }
      return Math.min(t * 500, 5000);
    },
    connectTimeout: 10000,
  });
  // Cast to unknown first to avoid the TS constructor overload tuple bug 
  return new (Redis as unknown as new (url: string, options: RedisOptions) => Redis)(REDIS_URL, opts);
}

export const redis = createClient() as any;

if (redis) {
  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (err: any) => logger.error({ err }, 'Redis connection error'));
}
