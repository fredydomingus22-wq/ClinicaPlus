"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = require("ioredis");
const pino_1 = __importDefault(require("pino"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const logger = (0, pino_1.default)({ name: 'worker-redis' });
// REDIS_URL must be read after dotenv.config() to ensure env vars are loaded.
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
/** Inject TLS options when REDIS_URL uses the rediss:// scheme */
function buildRedisOptions(extraOpts = {}) {
    const isTls = REDIS_URL.startsWith('rediss://');
    return {
        ...(isTls ? { tls: {} } : {}),
        ...extraOpts,
    };
}
function createClient() {
    const isDev = process.env.NODE_ENV === 'development';
    const opts = buildRedisOptions({
        maxRetriesPerRequest: null,
        retryStrategy: (t) => {
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
    return new ioredis_1.Redis(REDIS_URL, opts);
}
exports.redis = createClient();
if (exports.redis) {
    exports.redis.on('connect', () => logger.info('Redis connected'));
    exports.redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));
}
