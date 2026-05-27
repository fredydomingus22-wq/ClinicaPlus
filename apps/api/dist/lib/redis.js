"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisSub = exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("./config");
const logger_1 = require("./logger");
/** Create an ioredis options object, adding TLS when using rediss:// */
function buildRedisOptions(extraOpts = {}) {
    const isTls = config_1.config.REDIS_URL.startsWith("rediss://");
    const opts = { ...extraOpts };
    if (isTls) {
        opts.tls = {};
    }
    return opts;
}
function createRedisClient() {
    const isDev = config_1.config.NODE_ENV === "development";
    return new ioredis_1.default(config_1.config.REDIS_URL, buildRedisOptions({
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
            // Aumentar para 20 tentativas em dev para aguentar instabilidade (aprox. 1 minuto de tentativas)
            if (isDev && times > 20) {
                logger_1.logger.warn("Redis: Limite de tentativas excedido após 20 vezes.");
                return null;
            }
            const delay = Math.min(times * 500, 5000);
            return delay;
        },
        lazyConnect: false,
        enableReadyCheck: true,
        connectTimeout: 10000,
    }));
}
exports.redis = createRedisClient();
exports.redisSub = new ioredis_1.default(config_1.config.REDIS_URL, buildRedisOptions({ maxRetriesPerRequest: null }));
exports.redis.on("error", (err) => {
    logger_1.logger.error({ err }, "Redis connection error");
});
