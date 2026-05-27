import Redlock from 'redlock';
import { redis } from './redis';
import { logger } from './logger';

/**
 * Distributed lock manager using Redlock algorithm.
 * Prevents race conditions across multiple worker instances.
 */
export const redlock = new Redlock(
  [redis],
  {
    // The expected clock drift; for more details see:
    // https://www.npmjs.com/package/redlock#the-drift-factor
    driftFactor: 0.01,
    
    // The maximum number of times Redlock will attempt to lock a resource before erroring
    retryCount: 10,
    
    // The time in ms between attempts
    retryDelay: 200,
    
    // The maximum time in ms randomly added to retries
    retryJitter: 200,
  }
);

redlock.on('error', (err: Error) => {
  logger.error({ err }, 'Redlock error');
});

/**
 * Execute a function with a distributed lock.
 * 
 * @param resource - Unique identifier for the resource to lock
 * @param ttl - Time-to-live for the lock in milliseconds
 * @param fn - Async function to execute while holding the lock
 * @returns Result of the function
 */
export async function withLock<T>(
  resource: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const lock = await redlock.acquire([`locks:${resource}`], ttl);
  try {
    return await fn();
  } finally {
    await lock.release();
  }
}
