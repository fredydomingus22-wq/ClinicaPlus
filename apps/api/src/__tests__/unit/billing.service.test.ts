import { describe, it, expect, vi, beforeEach } from 'vitest';
import { billingService } from '../../services/billing.service';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    fatura: {
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
      vi.mocked((prisma.fatura as any).findMany).mockResolvedValue(mockFaturas);

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
    it('returns subscription when it exists', async () => {
      const mockSub = {
        plano: 'PRO',
        status: 'ATIVO',
        proximoFaturamento: new Date('2024-12-31'),
        dataFim: new Date('2024-12-31'),
      };
      vi.mocked((prisma.subscricao as any).findUnique).mockResolvedValue(mockSub);
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue({ id: 'c1', plano: 'PRO' } as any);

      const result = await billingService.getSubscriptionStatus('c1');

      expect(result.plano).toBe('PRO');
      expect(result.status).toBe('ATIVO');
      expect(result.proximaFatura).toBe(mockSub.proximoFaturamento.toISOString());
    });

    it('returns default status when no subscription exists', async () => {
      vi.mocked((prisma.subscricao as any).findUnique).mockResolvedValue(null);
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue({ id: 'c1', plano: 'BASICO' } as any);

      const result = await billingService.getSubscriptionStatus('c1');

      expect(result.plano).toBe('BASICO');
      expect(result.status).toContain('Trial');
      expect(result.diasRestantes).toBe(30);
    });

    it('throws 404 if clinic not found', async () => {
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue(null);

      await expect(billingService.getSubscriptionStatus('non-existent'))
        .rejects.toThrow(new AppError('Clínica não encontrada', 404, 'NOT_FOUND'));
    });
  });
});
