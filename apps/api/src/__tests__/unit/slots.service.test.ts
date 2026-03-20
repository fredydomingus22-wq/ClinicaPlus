/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAvailableSlots, isSlotAvailable } from '../../services/slots.service';
import { prisma } from '../../lib/prisma';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    agendamento: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    medico: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock current time to a fixed date for reliable testing (e.g. 10:00 AM)
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-10T09:00:00.000Z')); // 10:00 Luanda time
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('slots.service', () => {
  describe('isSlotAvailable', () => {
    it('returns true when no overlapping appointments exist', async () => {
      vi.mocked(prisma.agendamento.findMany).mockResolvedValue([]);

      const result = await isSlotAvailable(
        'm1',
        new Date('2026-06-10T09:00:00Z'),
        30,
        'c1'
      );

      expect(result).toBe(true);
      expect(prisma.agendamento.findMany).toHaveBeenCalledTimes(1);
    });

    it('returns false when slot is occupied', async () => {
      vi.mocked(prisma.agendamento.findMany).mockResolvedValue([
        { dataHora: new Date('2026-06-10T09:00:00Z'), duracao: 30 } as any
      ]);

      const result = await isSlotAvailable(
        'm1',
        new Date('2026-06-10T09:00:00Z'),
        30,
        'c1'
      );

      expect(result).toBe(false);
    });
  });

  describe('getAvailableSlots', () => {
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

    it('returns list of slots for a day with active doctor', async () => {
      vi.mocked(prisma.medico.findUnique).mockResolvedValue(mockMedicoAtivo as any);
      vi.mocked(prisma.agendamento.findMany).mockResolvedValue([]);

      await getAvailableSlots('m1', '2026-06-10', 'c1');

      // Given it's 10:00 Luanda time, and 1 hour notice, slots before 11:00 are locked.
      // 08:00 to 11:00 should be excluded if today. But let's test a future day first.
      
      const futureResult = await getAvailableSlots('m1', '2026-06-17', 'c1');
      
      // 08:00 to 17:00 = 9 hours * 2 slots/hr = 18 slots. Minus 2 slots for break (12:00-13:00) = 16 slots.
      expect(futureResult.length).toBe(16);
      expect(futureResult).toContain('08:00');
      expect(futureResult).toContain('11:30');
      expect(futureResult).toContain('13:00');
      expect(futureResult).not.toContain('12:00'); // break
      expect(futureResult).not.toContain('12:30'); // break
      expect(futureResult).toContain('16:30');
    });

    it('excludes already occupied slots', async () => {
      vi.mocked(prisma.medico.findUnique).mockResolvedValue(mockMedicoAtivo as any);
      // Mock an appointment at 13:00 Luanda time (12:00 UTC)
      vi.mocked(prisma.agendamento.findMany).mockResolvedValue([
        { dataHora: new Date('2026-06-17T12:00:00Z'), duracao: 30 }
      ] as any);

      const result = await getAvailableSlots('m1', '2026-06-17', 'c1');
      
      expect(result).not.toContain('13:00'); // Excluded because of appointment
      expect(result).toContain('13:30'); // Next slot is free
    });

    it('returns empty list for day the doctor does not work (e.g. sunday)', async () => {
      vi.mocked(prisma.medico.findUnique).mockResolvedValue(mockMedicoAtivo as any);
      vi.mocked(prisma.agendamento.findMany).mockResolvedValue([]);

      // 2026-06-14 is a Sunday
      const result = await getAvailableSlots('m1', '2026-06-14', 'c1');
      
      expect(result).toEqual([]);
    });

    it('respects doctor consultation duration logic (e.g. 60 mins vs 30 mins)', async () => {
      const mockMedico60 = {
        ...mockMedicoAtivo,
        duracaoConsulta: 60,
      };
      
      vi.mocked(prisma.medico.findUnique).mockResolvedValue(mockMedico60 as any);
      vi.mocked(prisma.agendamento.findMany).mockResolvedValue([]);

      const result = await getAvailableSlots('m1', '2026-06-17', 'c1');
      
      expect(result).toContain('08:00');
      expect(result).toContain('09:00');
      expect(result).not.toContain('08:30'); // Should only be hour boundaries
    });
  });
});
