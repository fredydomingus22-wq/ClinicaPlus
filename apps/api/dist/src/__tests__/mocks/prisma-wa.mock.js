"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockPrisma = void 0;
/**
 * Mock central do Prisma para unit tests do módulo WhatsApp.
 * Inclui todos os modelos wa_* mais os modelos base necessários.
 *
 * Para integration tests, usar a DB de teste real (DATABASE_URL_TEST).
 */
const vitest_1 = require("vitest");
exports.mockPrisma = {
    // ─── Modelos WhatsApp ────────────────────────────────────────
    waInstancia: {
        findUniqueOrThrow: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
        findFirst: vitest_1.vi.fn(),
        create: vitest_1.vi.fn(),
        update: vitest_1.vi.fn(),
        updateMany: vitest_1.vi.fn(),
        upsert: vitest_1.vi.fn(),
        delete: vitest_1.vi.fn(),
    },
    waAutomacao: {
        findFirstOrThrow: vitest_1.vi.fn(),
        findFirst: vitest_1.vi.fn(),
        findMany: vitest_1.vi.fn(),
        create: vitest_1.vi.fn(),
        createMany: vitest_1.vi.fn(),
        update: vitest_1.vi.fn(),
        upsert: vitest_1.vi.fn(),
    },
    waConversa: {
        findMany: vitest_1.vi.fn(),
        findFirst: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
        upsert: vitest_1.vi.fn(),
        create: vitest_1.vi.fn(),
        update: vitest_1.vi.fn(),
        updateMany: vitest_1.vi.fn(),
    },
    waMensagem: {
        create: vitest_1.vi.fn(),
        findMany: vitest_1.vi.fn(),
    },
    // ─── Modelos Base (usados pelos services WA) ─────────────────
    clinica: {
        findUniqueOrThrow: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
        update: vitest_1.vi.fn(),
    },
    medico: {
        findMany: vitest_1.vi.fn(),
        findFirst: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
        count: vitest_1.vi.fn(),
    },
    especialidade: {
        findMany: vitest_1.vi.fn(),
    },
    agendamento: {
        create: vitest_1.vi.fn(),
        findMany: vitest_1.vi.fn(),
        findFirst: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
    },
    paciente: {
        findMany: vitest_1.vi.fn(),
        findFirst: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
        create: vitest_1.vi.fn(),
        update: vitest_1.vi.fn(),
    },
    apiKey: {
        findFirst: vitest_1.vi.fn(),
        create: vitest_1.vi.fn(),
        findMany: vitest_1.vi.fn(),
    },
    auditLog: {
        create: vitest_1.vi.fn(),
    },
    // ─── Prisma client helpers ────────────────────────────────────
    $transaction: vitest_1.vi.fn((fn) => fn(exports.mockPrisma)),
    $disconnect: vitest_1.vi.fn().mockResolvedValue(undefined),
};
vitest_1.vi.mock('../../lib/prisma', () => ({ prisma: exports.mockPrisma }));
