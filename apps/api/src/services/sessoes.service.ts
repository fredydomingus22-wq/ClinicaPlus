import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';

export const sessoesService = {
  /**
   * Lista todas as sessões de um plano de tratamento específico
   */
  async listByPlano(clinicaId: string, planoId: string) {
    // Validar se o plano existe e pertence à clínica
    const plano = await prisma.planoTratamento.findFirst({
      where: { id: planoId, clinicaId }
    });

    if (!plano) {
      throw new AppError('Plano de tratamento não encontrado', 404);
    }

    const sessoes = await prisma.sessaoTratamento.findMany({
      where: { 
        planoId,
        clinicaId 
      },
      orderBy: { numeroSessao: 'asc' },
      include: {
        agendamento: true,
      }
    });

    return { data: sessoes };
  },

  /**
   * Atualiza uma sessão (estado, notas, etc)
   */
  async update(clinicaId: string, sessaoId: string, data: any) {
    const sessao = await prisma.sessaoTratamento.findFirst({
      where: { id: sessaoId, clinicaId }
    });

    if (!sessao) {
      throw new AppError('Sessão de tratamento não encontrada', 404);
    }

    const updated = await prisma.sessaoTratamento.update({
      where: { id: sessaoId },
      data: {
        estado: data.estado !== undefined ? data.estado : undefined,
        notas: data.notas !== undefined ? data.notas : undefined,
        ...(data.dataHora ? { dataHora: new Date(data.dataHora) } : {})
      }
    });

    return { data: updated };
  }
};
