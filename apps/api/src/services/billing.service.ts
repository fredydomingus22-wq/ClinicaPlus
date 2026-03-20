import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { FaturaAssinaturaDTO, SubscriptionStatusDTO, Plano } from '@clinicaplus/types';

export const billingService = {
  /**
   * Returns the billing history (invoices) for a specific clinic.
   */
  async getBillingHistory(clinicaId: string): Promise<FaturaAssinaturaDTO[]> {
    const faturas = await prisma.faturaAssinatura.findMany({
      where: { clinicaId },
      orderBy: { dataEmissao: 'desc' },
    });

    return faturas.map((f) => ({
      id: f.id,
      clinicaId: f.clinicaId,
      numero: f.numero,
      valor: f.valor,
      moeda: f.moeda,
      status: f.status as FaturaAssinaturaDTO['status'],
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

    if (!subscricao) {
      throw new AppError('Subscrição não encontrada', 404, 'NOT_FOUND');
    }

    const hoje = new Date();
    const difTempo = subscricao.validaAte 
      ? subscricao.validaAte.getTime() - hoje.getTime()
      : 0;
    const diasRestantes = Math.ceil(difTempo / (1000 * 3600 * 24));

    return {
      plano: subscricao.plano as Plano,
      status: subscricao.estado,
      proximaFatura: subscricao.validaAte?.toISOString() || hoje.toISOString(),
      diasRestantes: diasRestantes > 0 ? diasRestantes : 0,
    };
  }
};
