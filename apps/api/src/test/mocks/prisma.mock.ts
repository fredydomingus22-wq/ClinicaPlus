import { vi } from 'vitest';

// Mock declarativo — especificar apenas o que cada teste precisa
export const mockPrisma = {
  waInstancia:  { findUniqueOrThrow: vi.fn(), findFirstOrThrow: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), delete: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
  waAutomacao:  { findFirstOrThrow: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
  waConversa:   { upsert: vi.fn(), update: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), delete: vi.fn() },
  waMensagem:   { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  botIntegracao: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  paciente:     { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findFirstOrThrow: vi.fn(), findUniqueOrThrow: vi.fn(), findMany: vi.fn() },
  medico:       { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), findUniqueOrThrow: vi.fn(), findFirstOrThrow: vi.fn() },
  agendamento:  { create: vi.fn(), findMany: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), findUniqueOrThrow: vi.fn(), findFirstOrThrow: vi.fn(), delete: vi.fn() },
  especialidade: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findFirst: vi.fn(), findUniqueOrThrow: vi.fn() },
  clinica:      { findUniqueOrThrow: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  apiKey:       { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  utilizador:   { findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn(), findUniqueOrThrow: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  auditLog:     { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  webhook:      { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), findFirst: vi.fn() },
  notificacao:  { create: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  subscricao:   { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  configuracaoClinica: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  fatura:       { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  faturaAssinatura: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  prontuario:   { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  receita:      { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  exame:         { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  documento:     { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  lembreteAgendamento: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
