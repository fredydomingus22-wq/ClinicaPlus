import { prisma } from '../lib/prisma';
import { AtualizarSessaoDto } from '@clinicaplus/types';
import { SessaoTratamento, PlanoTratamento, Prisma } from '@prisma/client';

export const sessoesService = {
  async listByPlano(clinicaId: string, planoId: string): Promise<SessaoTratamento[]> {
    return prisma.sessaoTratamento.findMany({
      where: { clinicaId, planoId },
      orderBy: { numeroSessao: 'asc' }
    });
  },

  async update(clinicaId: string, id: string, data: AtualizarSessaoDto): Promise<SessaoTratamento> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const sessao = await tx.sessaoTratamento.update({
        where: { id, clinicaId },
        data: {
          estado: data.estado,
          notas: data.notas ?? null,
        },
        include: { plano: true }
      }) as SessaoTratamento & { plano: PlanoTratamento };

      // Lógica de conclusão automática do plano (Sprint I)
      if (data.estado === 'REALIZADO') {
        const sessoesRealizadas = await tx.sessaoTratamento.count({
          where: { planoId: sessao.planoId, estado: 'REALIZADO' }
        });

        const plano = sessao.plano;
        if (sessoesRealizadas === plano.totalSessoes) {
          await tx.planoTratamento.update({
            where: { id: sessao.planoId },
            data: { estado: 'CONCLUIDO', dataFimReal: new Date() }
          });
        }
      }

      return sessao as SessaoTratamento;
    });
  }
};
