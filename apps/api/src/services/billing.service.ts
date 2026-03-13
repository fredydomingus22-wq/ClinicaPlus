import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { FaturaDTO, SubscriptionStatusDTO, Plano } from '@clinicaplus/types';

export const billingService = {
  /**
   * Returns the billing history (invoices) for a specific clinic.
   */
  async getBillingHistory(clinicaId: string): Promise<FaturaDTO[]> {
    const faturas = await prisma.fatura.findMany({
      where: { clinicaId },
      orderBy: { dataEmissao: 'desc' },
    });

    return faturas.map((f) => ({
      id: f.id,
      clinicaId: f.clinicaId,
      numero: f.numero,
      valor: f.valor,
      moeda: f.moeda,
      status: f.status as FaturaDTO['status'],
      dataEmissao: f.dataEmissao.toISOString(),
      dataPagamento: f.dataPagamento?.toISOString() || null,
      dataVencimento: f.dataVencimento.toISOString(),
      urlPdf: f.urlPdf,
    }));
  },

  /**
   * Returns the current subscription status for a specific clinic.
   */
  async getSubscriptionStatus(clinicaId: string): Promise<SubscriptionStatusDTO> {
    const subscricao = await prisma.subscricao.findUnique({
      where: { clinicaId },
    });

    const clinica = await prisma.clinica.findUnique({
      where: { id: clinicaId },
      select: { plano: true },
    });

    if (!clinica) {
      throw new AppError('Clínica não encontrada', 404, 'NOT_FOUND');
    }

    // If no subscription record exists yet, return default based on clinic plan
    if (!subscricao) {
      const proximaFatura = new Date();
      proximaFatura.setMonth(proximaFatura.getMonth() + 1);

      return {
        plano: clinica.plano as Plano,
        status: 'ATIVO (Trial/Default)',
        proximaFatura: proximaFatura.toISOString(),
        diasRestantes: 30,
      };
    }

    const hoje = new Date();
    const difTempo = subscricao.dataFim.getTime() - hoje.getTime();
    const diasRestantes = Math.ceil(difTempo / (1000 * 3600 * 24));

    return {
      plano: subscricao.plano as Plano,
      status: subscricao.status,
      proximaFatura: subscricao.proximoFaturamento.toISOString(),
      diasRestantes: diasRestantes > 0 ? diasRestantes : 0,
    };
  }
};
