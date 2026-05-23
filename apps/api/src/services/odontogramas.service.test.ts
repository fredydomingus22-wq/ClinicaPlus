import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OdontogramaService } from './odontogramas.service';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { DenteFace, DenteStatus } from '@clinicaplus/types';

vi.mock('../lib/prisma', () => ({
  prisma: {
    agendamento: { findFirst: vi.fn() },
    odontograma: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const clinicaId = 'clinica-1';
const agendamentoId = 'agend-1';
const pacienteId = 'pac-1';
const medicoId = 'med-1';

const agendamentoMock = {
  id: agendamentoId,
  clinicaId,
  pacienteId,
  medicoId,
};

const marcacoes = [
  { numeroDente: 16, face: DenteFace.O, status: DenteStatus.CARIE },
];

describe('OdontogramaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar odontograma quando agendamento pertence à clínica e médico coincide', async () => {
      vi.mocked(prisma.agendamento.findFirst).mockResolvedValue(agendamentoMock as never);
      vi.mocked(prisma.odontograma.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.odontograma.create).mockResolvedValue({
        id: 'odo-1',
        clinicaId,
        pacienteId,
        medicoId,
        agendamentoId,
        marcacoes,
        criadoEm: new Date('2026-01-01'),
        atualizadoEm: new Date('2026-01-01'),
      } as never);

      const result = await OdontogramaService.create(clinicaId, {
        agendamentoId,
        pacienteId,
        medicoId,
        marcacoes,
      });

      expect(result.marcacoes).toEqual(marcacoes);
      expect(prisma.odontograma.create).toHaveBeenCalled();
    });

    it('deve actualizar odontograma existente para o mesmo agendamento (upsert)', async () => {
      vi.mocked(prisma.agendamento.findFirst).mockResolvedValue(agendamentoMock as never);
      vi.mocked(prisma.odontograma.findFirst).mockResolvedValue({
        id: 'odo-1',
        clinicaId,
        agendamentoId,
        marcacoes: [],
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      } as never);
      vi.mocked(prisma.odontograma.update).mockResolvedValue({
        id: 'odo-1',
        clinicaId,
        pacienteId,
        medicoId,
        agendamentoId,
        marcacoes,
        criadoEm: new Date('2026-01-01'),
        atualizadoEm: new Date('2026-01-02'),
      } as never);

      const result = await OdontogramaService.create(clinicaId, {
        agendamentoId,
        pacienteId,
        medicoId,
        marcacoes,
      });

      expect(prisma.odontograma.update).toHaveBeenCalled();
      expect(result.marcacoes).toEqual(marcacoes);
    });

    it('deve rejeitar quando médico não corresponde ao agendamento', async () => {
      vi.mocked(prisma.agendamento.findFirst).mockResolvedValue(agendamentoMock as never);

      await expect(
        OdontogramaService.create(clinicaId, {
          agendamentoId,
          pacienteId,
          medicoId: 'outro-medico',
          marcacoes,
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('getByAgendamento', () => {
    it('deve retornar null quando não existe registo para a consulta', async () => {
      vi.mocked(prisma.odontograma.findFirst).mockResolvedValue(null);

      const result = await OdontogramaService.getByAgendamento(clinicaId, agendamentoId);
      expect(result).toBeNull();
    });
  });
});
