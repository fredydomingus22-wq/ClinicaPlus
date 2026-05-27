"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Runs before all tests — global test environment setup
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.METRICS_TOKEN = process.env.METRICS_TOKEN || 'test-metrics-token-min-8-chars';
process.env.ALERT_EMAIL = process.env.ALERT_EMAIL || 'test@example.com';
const vitest_1 = require("vitest");
// Silence logger in tests — mock must include child() for pino-http compatibility
const createMockLogger = () => {
    const mock = {
        info: vitest_1.vi.fn(),
        warn: vitest_1.vi.fn(),
        error: vitest_1.vi.fn(),
        debug: vitest_1.vi.fn(),
        fatal: vitest_1.vi.fn(),
        trace: vitest_1.vi.fn(),
        silent: vitest_1.vi.fn(),
        level: 'silent',
        levels: {
            values: { fatal: 60, error: 50, warn: 40, info: 30, debug: 20, trace: 10 },
            labels: { '10': 'trace', '20': 'debug', '30': 'info', '40': 'warn', '50': 'error', '60': 'fatal' }
        },
        isLevelEnabled: vitest_1.vi.fn().mockReturnValue(false),
        child: vitest_1.vi.fn().mockImplementation(() => createMockLogger()),
    };
    return mock;
};
vitest_1.vi.mock('../../lib/logger', () => ({
    logger: createMockLogger(),
}));
vitest_1.vi.mock('bullmq', () => ({
    Queue: class {
        constructor() {
            this.add = vitest_1.vi.fn().mockResolvedValue({ id: 'mock-job-id' });
            this.remove = vitest_1.vi.fn().mockResolvedValue(true);
            this.getJob = vitest_1.vi.fn().mockResolvedValue(null);
            this.close = vitest_1.vi.fn().mockResolvedValue(undefined);
            this.on = vitest_1.vi.fn();
        }
    },
    Worker: class {
        constructor() {
            this.close = vitest_1.vi.fn().mockResolvedValue(undefined);
            this.on = vitest_1.vi.fn().mockImplementation(function () { return this; });
        }
    },
}));
vitest_1.vi.mock('../../lib/redis', () => ({
    redis: {
        get: vitest_1.vi.fn().mockResolvedValue(null),
        set: vitest_1.vi.fn().mockResolvedValue('OK'),
        del: vitest_1.vi.fn().mockResolvedValue(1),
        keys: vitest_1.vi.fn().mockResolvedValue([]),
        ping: vitest_1.vi.fn().mockResolvedValue('PONG'),
        publish: vitest_1.vi.fn().mockResolvedValue(1),
        quit: vitest_1.vi.fn().mockResolvedValue('OK'),
        on: vitest_1.vi.fn(),
    },
    redisSub: {
        subscribe: vitest_1.vi.fn().mockResolvedValue(1),
        quit: vitest_1.vi.fn().mockResolvedValue('OK'),
        on: vitest_1.vi.fn(),
    },
}));
// Ensure test DB env vars are set
if (!process.env.DATABASE_URL) {
    throw new Error('TEST: DATABASE_URL is not set. Use the test Supabase project.');
}
const vitest_2 = require("vitest");
const prisma_1 = require("../../lib/prisma");
(0, vitest_2.afterAll)(async () => {
    await prisma_1.prisma.$disconnect();
});
