// Runs before all tests — global test environment setup
import { vi } from 'vitest';

// Silence logger in tests
vi.mock('../../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Ensure test DB env vars are set
if (!process.env.DATABASE_URL) {
  throw new Error('TEST: DATABASE_URL is not set. Use the test Supabase project.');
}
