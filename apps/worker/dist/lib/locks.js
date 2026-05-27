"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redlock = void 0;
exports.withLock = withLock;
const redlock_1 = __importDefault(require("redlock"));
const redis_1 = require("./redis");
const logger_1 = require("./logger");
/**
 * Distributed lock manager using Redlock algorithm.
 * Prevents race conditions across multiple worker instances.
 */
exports.redlock = new redlock_1.default([redis_1.redis], {
    // The expected clock drift; for more details see:
    // https://www.npmjs.com/package/redlock#the-drift-factor
    driftFactor: 0.01,
    // The maximum number of times Redlock will attempt to lock a resource before erroring
    retryCount: 10,
    // The time in ms between attempts
    retryDelay: 200,
    // The maximum time in ms randomly added to retries
    retryJitter: 200,
});
exports.redlock.on('error', (err) => {
    logger_1.logger.error({ err }, 'Redlock error');
});
/**
 * Execute a function with a distributed lock.
 *
 * @param resource - Unique identifier for the resource to lock
 * @param ttl - Time-to-live for the lock in milliseconds
 * @param fn - Async function to execute while holding the lock
 * @returns Result of the function
 */
async function withLock(resource, ttl, fn) {
    const lock = await exports.redlock.acquire([`locks:${resource}`], ttl);
    try {
        return await fn();
    }
    finally {
        await lock.release();
    }
}
