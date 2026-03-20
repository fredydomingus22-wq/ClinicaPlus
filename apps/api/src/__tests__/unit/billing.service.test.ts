/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { billingService } from '../../services/billing.service';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    faturaAssinatura: {
      findMany: vi.fn(),
    },
    subscricao: {
      findUnique: vi.fn(),
    },
    clinica: {
      findUnique: vi.fn(),
    },
  },
}));

describe('billing.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBillingHistory', () => {
    it('returns formatted invoices for a clinic', async () => {
      const mockFaturas = [
        {
          id: 'f1',
          clinicaId: 'c1',
          numero: 'FAT-001',
          valor: 5000,
          moeda: 'Kz',
          status: 'PAGO',
          dataEmissao: new Date('2024-01-01'),
          dataVencimento: new Date('2024-01-15'),
          dataPagamento: new Date('2024-01-02'),
          urlPdf: 'http://test.com/f1.pdf',
        }
      ];
      vi.mocked((prisma.faturaAssinatura as any).findMany).mockResolvedValue(mockFaturas);

      const result = await billingService.getBillingHistory('c1');

      const [firstFatura] = mockFaturas;
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'f1',
        clinicaId: 'c1',
        numero: 'FAT-001',
        valor: 5000,
        moeda: 'Kz',
        status: 'PAGO',
        dataEmissao: firstFatura!.dataEmissao.toISOString(),
        dataPagamento: firstFatura!.dataPagamento!.toISOString(),
        dataVencimento: firstFatura!.dataVencimento.toISOString(),
        urlPdf: 'http://test.com/f1.pdf',
      });
    });
  });

  describe('getSubscriptionStatus', () => {
    it('returns subscription status from clinic cache', async () => {
      const mockClinica = {
        id: 'c1',
        plano: 'PRO',
        subscricaoEstado: 'ACTIVA',
        subscricaoValidaAte: new Date('2024-12-31'),
      };
      
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue(mockClinica as any);

      const result = await billingService.getSubscriptionStatus('c1');

      expect(result.plano).toBe('PRO');
      expect(result.status).toBe('ACTIVA');
      expect(result.proximaFatura).toBe(mockClinica.subscricaoValidaAte.toISOString());
      expect(result.diasRestantes).toBeGreaterThanOrEqual(0);
    });

    it('returns default status when date is null', async () => {
      const mockClinica = {
        id: 'c1',
        plano: 'BASICO',
        subscricaoEstado: 'TRIAL',
        subscricaoValidaAte: null,
      };
      
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue(mockClinica as any);

      const result = await billingService.getSubscriptionStatus('c1');

      expect(result.plano).toBe('BASICO');
      expect(result.status).toBe('TRIAL');
      expect(result.diasRestantes).toBe(0);
    });

    it('throws 404 if clinic not found', async () => {
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue(null);

      await expect(billingService.getSubscriptionStatus('non-existent'))
        .rejects.toThrow(new AppError('Clínica não encontrada', 404, 'NOT_FOUND'));
    });
  });
});
