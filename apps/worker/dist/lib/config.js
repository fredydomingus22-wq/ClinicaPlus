"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const configSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().url(),
    DIRECT_URL: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().min(1), // redis:// ou rediss:// (TLS) — Zod url() rejeita estes protocolos
    RESEND_API_KEY: zod_1.z.string().min(1),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    ALERT_EMAIL: zod_1.z.string().email().optional(),
});
const parsed = configSchema.safeParse(process.env);
if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid worker environment variables:', JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
}
exports.config = parsed.data;
