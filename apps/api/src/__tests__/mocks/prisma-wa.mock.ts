/**
 * Mock central do Prisma para unit tests do módulo WhatsApp.
 * Inclui todos os modelos wa_* mais os modelos base necessários.
 *
 * Para integration tests, usar a DB de teste real (DATABASE_URL_TEST).
 */
import { vi } from 'vitest';

export const mockPrisma = {
  // ─── Modelos WhatsApp ────────────────────────────────────────
  waInstancia: {
    findUniqueOrThrow: vi.fn(),
    findUnique:        vi.fn(),
    findFirst:         vi.fn(),
    create:            vi.fn(),
    update:            vi.fn(),
    updateMany:        vi.fn(),
    upsert:            vi.fn(),
    delete:            vi.fn(),
  },
  waAutomacao: {
    findFirstOrThrow: vi.fn(),
    findFirst:        vi.fn(),
    findMany:         vi.fn(),
    create:           vi.fn(),
    createMany:       vi.fn(),
    update:           vi.fn(),
    upsert:           vi.fn(),
  },
  waConversa: {
    findMany:          vi.fn(),
    findFirst:         vi.fn(),
    findUnique:        vi.fn(),
    upsert:            vi.fn(),
    create:            vi.fn(),
    update:            vi.fn(),
    updateMany:        vi.fn(),
  },
  waMensagem: {
    create:  vi.fn(),
    findMany: vi.fn(),
  },

  // ─── Modelos Base (usados pelos services WA) ─────────────────
  clinica: {
    findUniqueOrThrow: vi.fn(),
    findUnique:        vi.fn(),
    update:            vi.fn(),
  },
  medico: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  especialidade: {
    findMany: vi.fn(),
  },
  agendamento: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  paciente: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update:    vi.fn(),
  },
  apiKey: {
    findFirst: vi.fn(),
    create:    vi.fn(),
    findMany:  vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },

  // ─── Prisma client helpers ────────────────────────────────────
  $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
  $disconnect:  vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
