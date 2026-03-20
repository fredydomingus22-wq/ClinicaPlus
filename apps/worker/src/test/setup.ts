import { vi, beforeEach } from 'vitest';

// Mock global dependencies
vi.mock('../lib/prisma', () => ({
  prisma: {
    agendamento: { findMany: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    waAutomacao: { findFirst: vi.fn() },
    waConversa: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    clinica: { findUnique: vi.fn() },
  }
}));

vi.mock('../lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    quit: vi.fn(),
    ping: vi.fn(),
  }
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-id' }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});
