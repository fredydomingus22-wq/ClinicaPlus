"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockPrisma = void 0;
const vitest_1 = require("vitest");
// Mock declarativo — especificar apenas o que cada teste precisa
exports.mockPrisma = {
    waInstancia: { findUniqueOrThrow: vitest_1.vi.fn(), findFirstOrThrow: vitest_1.vi.fn(), create: vitest_1.vi.fn(), update: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), findFirst: vitest_1.vi.fn(), delete: vitest_1.vi.fn(), findMany: vitest_1.vi.fn(), upsert: vitest_1.vi.fn() },
    waAutomacao: { findFirstOrThrow: vitest_1.vi.fn(), findUniqueOrThrow: vitest_1.vi.fn(), update: vitest_1.vi.fn(), findMany: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), findFirst: vitest_1.vi.fn(), upsert: vitest_1.vi.fn(), delete: vitest_1.vi.fn() },
    waConversa: { upsert: vitest_1.vi.fn(), update: vitest_1.vi.fn(), findFirst: vitest_1.vi.fn(), findMany: vitest_1.vi.fn(), updateMany: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), findUniqueOrThrow: vitest_1.vi.fn(), delete: vitest_1.vi.fn() },
    waMensagem: { create: vitest_1.vi.fn(), findMany: vitest_1.vi.fn(), findFirst: vitest_1.vi.fn() },
    botIntegracao: { findFirst: vitest_1.vi.fn(), findMany: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), create: vitest_1.vi.fn(), update: vitest_1.vi.fn(), delete: vitest_1.vi.fn() },
    paciente: { findUnique: vitest_1.vi.fn(), findFirst: vitest_1.vi.fn(), create: vitest_1.vi.fn(), update: vitest_1.vi.fn(), findFirstOrThrow: vitest_1.vi.fn(), findUniqueOrThrow: vitest_1.vi.fn(), findMany: vitest_1.vi.fn() },
    medico: { findMany: vitest_1.vi.fn(), count: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), findFirst: vitest_1.vi.fn(), findUniqueOrThrow: vitest_1.vi.fn(), findFirstOrThrow: vitest_1.vi.fn() },
    agendamento: { create: vitest_1.vi.fn(), findMany: vitest_1.vi.fn(), update: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), findFirst: vitest_1.vi.fn(), findUniqueOrThrow: vitest_1.vi.fn(), findFirstOrThrow: vitest_1.vi.fn(), delete: vitest_1.vi.fn() },
    especialidade: { findMany: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), create: vitest_1.vi.fn(), update: vitest_1.vi.fn(), findFirst: vitest_1.vi.fn(), findUniqueOrThrow: vitest_1.vi.fn() },
    clinica: { findUniqueOrThrow: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), findFirst: vitest_1.vi.fn(), findMany: vitest_1.vi.fn() },
    apiKey: { findFirst: vitest_1.vi.fn(), create: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), findUniqueOrThrow: vitest_1.vi.fn(), update: vitest_1.vi.fn() },
    utilizador: { findUnique: vitest_1.vi.fn(), update: vitest_1.vi.fn(), findFirst: vitest_1.vi.fn(), findUniqueOrThrow: vitest_1.vi.fn(), findMany: vitest_1.vi.fn(), create: vitest_1.vi.fn() },
    auditLog: { create: vitest_1.vi.fn(), findMany: vitest_1.vi.fn(), count: vitest_1.vi.fn() },
    webhook: { findMany: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), create: vitest_1.vi.fn(), update: vitest_1.vi.fn(), delete: vitest_1.vi.fn(), findFirst: vitest_1.vi.fn() },
    notificacao: { create: vitest_1.vi.fn(), findMany: vitest_1.vi.fn(), update: vitest_1.vi.fn(), updateMany: vitest_1.vi.fn() },
    subscricao: { findFirst: vitest_1.vi.fn(), findMany: vitest_1.vi.fn(), create: vitest_1.vi.fn(), update: vitest_1.vi.fn() },
    configuracaoClinica: { findUnique: vitest_1.vi.fn(), update: vitest_1.vi.fn(), create: vitest_1.vi.fn() },
    fatura: { findMany: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), create: vitest_1.vi.fn() },
    faturaAssinatura: { findMany: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), create: vitest_1.vi.fn() },
    prontuario: { findMany: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), create: vitest_1.vi.fn() },
    receita: { findMany: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), create: vitest_1.vi.fn() },
    exame: { findMany: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), create: vitest_1.vi.fn() },
    documento: { findMany: vitest_1.vi.fn(), findUnique: vitest_1.vi.fn(), create: vitest_1.vi.fn() },
    lembreteAgendamento: { findMany: vitest_1.vi.fn(), create: vitest_1.vi.fn(), deleteMany: vitest_1.vi.fn() },
    $transaction: vitest_1.vi.fn((fn) => fn(exports.mockPrisma)),
};
vitest_1.vi.mock('../../lib/prisma', () => ({ prisma: exports.mockPrisma }));
