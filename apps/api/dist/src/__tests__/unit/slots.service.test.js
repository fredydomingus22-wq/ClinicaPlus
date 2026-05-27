"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const vitest_1 = require("vitest");
const slots_service_1 = require("../../services/slots.service");
const prisma_1 = require("../../lib/prisma");
vitest_1.vi.mock('../../lib/prisma', () => ({
    prisma: {
        agendamento: {
            findFirst: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
        },
        medico: {
            findUnique: vitest_1.vi.fn(),
        },
    },
}));
// Mock current time to a fixed date for reliable testing (e.g. 10:00 AM)
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.useFakeTimers();
    vitest_1.vi.setSystemTime(new Date('2026-06-10T09:00:00.000Z')); // 10:00 Luanda time
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.clearAllMocks();
    vitest_1.vi.useRealTimers();
});
(0, vitest_1.describe)('slots.service', () => {
    (0, vitest_1.describe)('isSlotAvailable', () => {
        (0, vitest_1.it)('returns true when no overlapping appointments exist', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.agendamento.findMany).mockResolvedValue([]);
            const result = await (0, slots_service_1.isSlotAvailable)('m1', new Date('2026-06-10T09:00:00Z'), 30, 'c1');
            (0, vitest_1.expect)(result).toBe(true);
            (0, vitest_1.expect)(prisma_1.prisma.agendamento.findMany).toHaveBeenCalledTimes(1);
        });
        (0, vitest_1.it)('returns false when slot is occupied', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.agendamento.findMany).mockResolvedValue([
                { dataHora: new Date('2026-06-10T09:00:00Z'), duracao: 30 }
            ]);
            const result = await (0, slots_service_1.isSlotAvailable)('m1', new Date('2026-06-10T09:00:00Z'), 30, 'c1');
            (0, vitest_1.expect)(result).toBe(false);
        });
    });
    (0, vitest_1.describe)('getAvailableSlots', () => {
        const mockMedicoAtivo = {
            id: 'm1',
            clinicaId: 'c1',
            ativo: true,
            duracaoConsulta: 30,
            horario: {
                quarta: { ativo: true, inicio: '08:00', fim: '17:00', pausaInicio: '12:00', pausaFim: '13:00' }, // 2026-06-10 is a Wednesday
                domingo: { ativo: false }, // 2026-06-14 is a Sunday
            },
        };
        (0, vitest_1.it)('returns list of slots for a day with active doctor', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.medico.findUnique).mockResolvedValue(mockMedicoAtivo);
            vitest_1.vi.mocked(prisma_1.prisma.agendamento.findMany).mockResolvedValue([]);
            await (0, slots_service_1.getAvailableSlots)('m1', '2026-06-10', 'c1');
            // Given it's 10:00 Luanda time, and 1 hour notice, slots before 11:00 are locked.
            // 08:00 to 11:00 should be excluded if today. But let's test a future day first.
            const futureResult = await (0, slots_service_1.getAvailableSlots)('m1', '2026-06-17', 'c1');
            // 08:00 to 17:00 = 9 hours * 2 slots/hr = 18 slots. Minus 2 slots for break (12:00-13:00) = 16 slots.
            (0, vitest_1.expect)(futureResult.length).toBe(16);
            (0, vitest_1.expect)(futureResult).toContain('08:00');
            (0, vitest_1.expect)(futureResult).toContain('11:30');
            (0, vitest_1.expect)(futureResult).toContain('13:00');
            (0, vitest_1.expect)(futureResult).not.toContain('12:00'); // break
            (0, vitest_1.expect)(futureResult).not.toContain('12:30'); // break
            (0, vitest_1.expect)(futureResult).toContain('16:30');
        });
        (0, vitest_1.it)('excludes already occupied slots', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.medico.findUnique).mockResolvedValue(mockMedicoAtivo);
            // Mock an appointment at 13:00 Luanda time (12:00 UTC)
            vitest_1.vi.mocked(prisma_1.prisma.agendamento.findMany).mockResolvedValue([
                { dataHora: new Date('2026-06-17T12:00:00Z'), duracao: 30 }
            ]);
            const result = await (0, slots_service_1.getAvailableSlots)('m1', '2026-06-17', 'c1');
            (0, vitest_1.expect)(result).not.toContain('13:00'); // Excluded because of appointment
            (0, vitest_1.expect)(result).toContain('13:30'); // Next slot is free
        });
        (0, vitest_1.it)('returns empty list for day the doctor does not work (e.g. sunday)', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.medico.findUnique).mockResolvedValue(mockMedicoAtivo);
            vitest_1.vi.mocked(prisma_1.prisma.agendamento.findMany).mockResolvedValue([]);
            // 2026-06-14 is a Sunday
            const result = await (0, slots_service_1.getAvailableSlots)('m1', '2026-06-14', 'c1');
            (0, vitest_1.expect)(result).toEqual([]);
        });
        (0, vitest_1.it)('respects doctor consultation duration logic (e.g. 60 mins vs 30 mins)', async () => {
            const mockMedico60 = {
                ...mockMedicoAtivo,
                duracaoConsulta: 60,
            };
            vitest_1.vi.mocked(prisma_1.prisma.medico.findUnique).mockResolvedValue(mockMedico60);
            vitest_1.vi.mocked(prisma_1.prisma.agendamento.findMany).mockResolvedValue([]);
            const result = await (0, slots_service_1.getAvailableSlots)('m1', '2026-06-17', 'c1');
            (0, vitest_1.expect)(result).toContain('08:00');
            (0, vitest_1.expect)(result).toContain('09:00');
            (0, vitest_1.expect)(result).not.toContain('08:30'); // Should only be hour boundaries
        });
    });
});
