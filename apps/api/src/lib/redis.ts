import Redis, { RedisOptions } from "ioredis";
import { config } from "./config";
import { logger } from "./logger";

/** Create an ioredis options object, adding TLS when using rediss:// */
function buildRedisOptions(extraOpts: RedisOptions = {}): RedisOptions {
  const isTls = config.REDIS_URL.startsWith("rediss://");
  const opts: RedisOptions = { ...extraOpts };
  if (isTls) {
    opts.tls = {};
  }
  return opts;
}

function createRedisClient(): Redis {
  const isDev = config.NODE_ENV === "development";

  return new Redis(
    config.REDIS_URL,
    buildRedisOptions({
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => {
        // Aumentar para 20 tentativas em dev para aguentar instabilidade (aprox. 1 minuto de tentativas)
        if (isDev && times > 20) {
          logger.warn("Redis: Limite de tentativas excedido após 20 vezes.");
          return null;
        }
        const delay = Math.min(times * 500, 5000);
        return delay;
      },
      lazyConnect: false,
      enableReadyCheck: true,
      connectTimeout: 10000,
    })
  );
}

export const redis = createRedisClient();

export const redisSub = new Redis(
  config.REDIS_URL,
  buildRedisOptions({ maxRetriesPerRequest: null }) as unknown as RedisOptions
);

redis.on("error", (err: unknown): void => {
  logger.error({ err }, "Redis connection error");
});
