import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { EstadoSessao, EstadoPlano } from '@prisma/client';
import { auditLogService } from './auditLog.service';
import { AtualizarSessaoDto } from '@clinicaplus/types';

const TRANSICOES: Record<EstadoSessao, EstadoSessao[]> = {
  AGENDADO: ['REALIZADO', 'FALTOU', 'CANCELADO'],
  FALTOU: ['AGENDADO'],
  REALIZADO: [],
  CANCELADO: [],
};

function assertSessaoTransicaoValida(actual: EstadoSessao, destino: EstadoSessao): void {
  const validas = TRANSICOES[actual];
  if (!validas.includes(destino)) {
    throw new AppError(`Não é possível passar de "${actual}" para "${destino}"`, 400);
  }
}

export const sessoesService = {
  /**
   * Lista todas as sessões de um plano de tratamento específico
   */
  async listByPlano(clinicaId: string, planoId: string): Promise<{ data: unknown[] }> {
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
  async update(clinicaId: string, sessaoId: string, data: AtualizarSessaoDto, userId: string = 'SISTEMA'): Promise<{ data: unknown }> {
    const sessao = await prisma.sessaoTratamento.findFirst({
      where: { id: sessaoId, clinicaId }
    });

    if (!sessao) {
      throw new AppError('Sessão de tratamento não encontrada', 404);
    }

    if (data.estado) {
      assertSessaoTransicaoValida(sessao.estado, data.estado as EstadoSessao);
    }

    const updated = await prisma.sessaoTratamento.update({
      where: { id: sessaoId },
      data: {
        ...(data.estado !== undefined ? { estado: data.estado as EstadoSessao } : {}),
        ...(data.notas !== undefined ? { notas: data.notas } : {}),
        ...(data.dataHora !== undefined ? { dataHora: data.dataHora } : {})
      }
    });

    // Lógica de conclusão automática do plano
    if (data.estado === 'REALIZADO') {
      const planoId = sessao.planoId;
      const totalSessoes = await prisma.sessaoTratamento.count({
        where: { planoId, clinicaId },
      });
      const sessoesRealizadas = await prisma.sessaoTratamento.count({
        where: { planoId, clinicaId, estado: 'REALIZADO' },
      });

      if (sessoesRealizadas >= totalSessoes) {
        await prisma.planoTratamento.update({
          where: { id: planoId },
          data: { estado: EstadoPlano.CONCLUIDO, dataFimReal: new Date() },
        });

        await auditLogService.log({
          actorId: userId,
          accao: 'UPDATE',
          recurso: 'PlanoTratamento',
          recursoId: planoId,
          depois: { estado: 'CONCLUIDO' },
          clinicaId,
        });
      }
    }

    return { data: updated };
  }
};
