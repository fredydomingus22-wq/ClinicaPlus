import { vi } from 'vitest';

// Mock declarativo — especificar apenas o que cada teste precisa
export const mockPrisma = {
  waInstancia:  { findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  waAutomacao:  { findFirstOrThrow: vi.fn(), update: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  waConversa:   { upsert: vi.fn(), update: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  waMensagem:   { create: vi.fn(), findMany: vi.fn() },
  paciente:     { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  medico:       { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
  agendamento:  { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  especialidade: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  clinica:      { findUniqueOrThrow: vi.fn(), findUnique: vi.fn() },
  apiKey:       { findFirst: vi.fn(), create: vi.fn() },
  auditLog:     { create: vi.fn() },
  $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
