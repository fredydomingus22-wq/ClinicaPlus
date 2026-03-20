/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subscricaoService } from '../../services/subscricao.service';
import { prisma } from '../../lib/prisma';
import { notificationService } from '../../services/notification.service';
import { Plano, EstadoSubscricao, RazaoMudancaPlano } from '@clinicaplus/types';
import { AppError } from '../../lib/AppError';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    clinica: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    subscricao: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    planoLimite: {
      findUniqueOrThrow: vi.fn(),
    },
    medico: {
      count: vi.fn(),
    },
    agendamento: {
      count: vi.fn(),
    },
    paciente: {
      count: vi.fn(),
    },
    apiKey: {
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

vi.mock('../../services/notification.service', () => ({
  notificationService: {
    enviarEmailContaSuspensa: vi.fn(),
  },
}));

describe('subscricao.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('criarNovaSubscricao', () => {
    it('creates a new subscription and updates clinic cache', async () => {
      const mockClinica = { id: 'c1', plano: Plano.BASICO };
      const mockSubscricao = { id: 's1', validaAte: new Date() };

      vi.mocked(prisma.clinica.findUniqueOrThrow).mockResolvedValue(mockClinica as any);
      vi.mocked(prisma.subscricao.create).mockResolvedValue(mockSubscricao as any);

      await subscricaoService.criarNovaSubscricao({
        clinicaId: 'c1',
        plano: Plano.PRO,
        estado: EstadoSubscricao.ACTIVA,
        razao: RazaoMudancaPlano.UPGRADE_MANUAL,
        alteradoPor: 'u1',
      });

      expect(prisma.subscricao.create).toHaveBeenCalled();
      expect(prisma.clinica.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({
          plano: Plano.PRO,
          subscricaoEstado: EstadoSubscricao.ACTIVA,
        }),
      }));
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('verificarLimite', () => {
    it('throws error when medicos limit reached', async () => {
      vi.mocked(prisma.clinica.findUniqueOrThrow).mockResolvedValue({ id: 'c1', plano: Plano.BASICO } as any);
      vi.mocked(prisma.planoLimite.findUniqueOrThrow).mockResolvedValue({ maxMedicos: 5 } as any);
      vi.mocked(prisma.medico.count).mockResolvedValue(5);

      await expect(subscricaoService.verificarLimite('c1', 'medicos'))
        .rejects.toThrow(AppError);
      
      try {
        await subscricaoService.verificarLimite('c1', 'medicos');
      } catch (err: any) {
        expect(err.code).toBe('PLAN_LIMIT_REACHED');
        expect(err.statusCode).toBe(402);
      }
    });

    it('allows operation when under limit', async () => {
      vi.mocked(prisma.clinica.findUniqueOrThrow).mockResolvedValue({ id: 'c1', plano: Plano.BASICO } as any);
      vi.mocked(prisma.planoLimite.findUniqueOrThrow).mockResolvedValue({ maxMedicos: 5 } as any);
      vi.mocked(prisma.medico.count).mockResolvedValue(4);

      await expect(subscricaoService.verificarLimite('c1', 'medicos')).resolves.not.toThrow();
    });

    it('ignores limit if set to -1', async () => {
      vi.mocked(prisma.clinica.findUniqueOrThrow).mockResolvedValue({ id: 'c1', plano: Plano.PRO } as any);
      vi.mocked(prisma.planoLimite.findUniqueOrThrow).mockResolvedValue({ maxMedicos: -1 } as any);
      vi.mocked(prisma.medico.count).mockResolvedValue(100);

      await expect(subscricaoService.verificarLimite('c1', 'medicos')).resolves.not.toThrow();
    });
  });

  describe('suspender', () => {
    it('downgrades to BASICO and sends email', async () => {
      vi.mocked(prisma.clinica.findUniqueOrThrow).mockResolvedValue({ id: 'c1', plano: Plano.PRO } as any);
      vi.mocked(prisma.subscricao.create).mockResolvedValue({ id: 's2', validaAte: new Date() } as any);

      await subscricaoService.suspender('c1');

      expect(prisma.subscricao.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          plano: Plano.BASICO,
          estado: EstadoSubscricao.SUSPENSA,
          razao: RazaoMudancaPlano.DOWNGRADE_AUTO,
        }),
      }));
      expect(notificationService.enviarEmailContaSuspensa).toHaveBeenCalledWith('c1');
    });
  });
});
