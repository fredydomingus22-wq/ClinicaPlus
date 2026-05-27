"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const vitest_1 = require("vitest");
const patientNumber_service_1 = require("../../services/patientNumber.service");
const prisma_1 = require("../../lib/prisma");
vitest_1.vi.mock('../../lib/prisma', () => ({
    prisma: {
        paciente: {
            findFirst: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.useFakeTimers();
    vitest_1.vi.setSystemTime(new Date('2026-06-10T09:00:00.000Z')); // Year 2026
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.clearAllMocks();
    vitest_1.vi.useRealTimers();
});
(0, vitest_1.describe)('patientNumber.service', () => {
    const clinicaId = 'c1';
    const prefix = 'P-2026-';
    (0, vitest_1.it)('generates P-2026-0001 when no patients exist for that year', async () => {
        vitest_1.vi.mocked(prisma_1.prisma.paciente.findFirst).mockResolvedValue(null);
        const result = await (0, patientNumber_service_1.generatePatientNumber)(clinicaId);
        (0, vitest_1.expect)(result).toBe(`${prefix}0001`);
        (0, vitest_1.expect)(prisma_1.prisma.paciente.findFirst).toHaveBeenCalledWith({
            where: {
                clinicaId,
                numeroPaciente: { startsWith: prefix },
            },
            orderBy: { numeroPaciente: 'desc' },
            select: { numeroPaciente: true },
        });
    });
    (0, vitest_1.it)('generates P-2026-0042 when last patient is P-2026-0041', async () => {
        vitest_1.vi.mocked(prisma_1.prisma.paciente.findFirst).mockResolvedValue({
            numeroPaciente: `${prefix}0041`,
        });
        const result = await (0, patientNumber_service_1.generatePatientNumber)(clinicaId);
        (0, vitest_1.expect)(result).toBe(`${prefix}0042`);
    });
    (0, vitest_1.it)('pads with zeroes correctly (e.g. from 9 to 10 is 0010)', async () => {
        vitest_1.vi.mocked(prisma_1.prisma.paciente.findFirst).mockResolvedValue({
            numeroPaciente: `${prefix}0009`,
        });
        const result = await (0, patientNumber_service_1.generatePatientNumber)(clinicaId);
        (0, vitest_1.expect)(result).toBe(`${prefix}0010`);
    });
    (0, vitest_1.it)('ignores patients from previous years (starts fresh at 0001)', async () => {
        // We already mocked findFirst to filter by prefix (`P-2026-`).
        // If there were `P-2025-0099`, it wouldn't be returned by findFirst due to where clause.
        // So findFirst resolves to null.
        vitest_1.vi.mocked(prisma_1.prisma.paciente.findFirst).mockResolvedValue(null);
        const result = await (0, patientNumber_service_1.generatePatientNumber)(clinicaId);
        (0, vitest_1.expect)(result).toBe(`${prefix}0001`);
    });
});
