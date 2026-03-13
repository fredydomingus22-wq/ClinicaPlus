import Redis from 'ioredis';
import { config } from './config';
import { logger } from './logger';

// Cliente principal (GET, SET, PUBLISH)
export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (t: number): number => Math.min(t * 200, 2000),
  lazyConnect: false,
  enableReadyCheck: true,
});

// Cliente separado apenas para SUBSCRIBE (ioredis não permite outros comandos durante subscribe)
export const redisSub = new Redis(config.REDIS_URL);

redis.on('error', (err: unknown): void => {
  logger.error({ err }, 'Redis connection error');
});
