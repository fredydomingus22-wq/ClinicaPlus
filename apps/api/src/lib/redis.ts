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
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => {
        if (isDev && times > 1) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: false,
      enableReadyCheck: true,
      connectTimeout: 5000,
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
