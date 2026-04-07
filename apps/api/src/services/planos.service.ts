import { prisma } from '../lib/prisma';
import { CriarPlanoDto, AtualizarPlanoDto } from '@clinicaplus/types';
import { tratamentoQueue } from '../lib/queues';
import { JobNames } from '@clinicaplus/events';
import { EstadoPlano, Prisma } from '@prisma/client';

export const planosService = {
  /**
   * Cria um novo plano de tratamento.
   * Nota: A criação de sessões será delegada a um worker via BullMQ na Sprint II.
   */
  async create(clinicaId: string, data: CriarPlanoDto): Promise<unknown> {
    const { 
      pacienteId, 
      medicoId, 
      tipoId, 
      totalSessoes, 
      frequenciaSemana, 
      dataInicio, 
      descricao, 
      observacoes,
      agendamentoOrigemId,
      responsavelId
    } = data;

    // Cálculo simples de data de fim prevista (Sprint I)
    const semanas = Math.ceil(totalSessoes / frequenciaSemana);
    const dataFimPrevista = new Date(dataInicio);
    dataFimPrevista.setDate(dataFimPrevista.getDate() + (semanas * 7));

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const plano = await tx.planoTratamento.create({
        data: {
          clinicaId,
          pacienteId,
          medicoId,
          tipoId,
          totalSessoes,
          frequenciaSemana,
          dataInicio,
          dataFimPrevista,
          descricao: descricao ?? null,
          observacoes: observacoes ?? null,
          agendamentoOrigemId: agendamentoOrigemId ?? null,
          responsavelId: responsavelId ?? null,
          estado: 'ACTIVO'
        },
        include: { tipoTratamento: true, paciente: true }
      });

      // Sprint II: Disparar Job BullMQ para gerar as sessões na base de dados
      await tratamentoQueue.add(
        JobNames.TRATAMENTO_GERAR_SESSOES, 
        { planoId: plano.id, clinicaId },
        { jobId: `${plano.id}_creation_job` } // Idempotência
      );

      return plano;
    });
  },

  /**
   * Lists all treatment plans for a clinic with optional filters.
   */
  async listAll(clinicaId: string, filters: { estado?: string; q?: string }): Promise<unknown[]> {
    return prisma.planoTratamento.findMany({
      where: { 
        clinicaId,
        ...(filters.estado ? { estado: filters.estado as EstadoPlano } : {}),
        ...(filters.q ? {
          OR: [
            { paciente: { nome: { contains: filters.q, mode: 'insensitive' } } },
            { tipoTratamento: { nome: { contains: filters.q, mode: 'insensitive' } } },
            { descricao: { contains: filters.q, mode: 'insensitive' } }
          ]
        } : {})
      },
      include: { 
        tipoTratamento: true,
        paciente: { select: { id: true, nome: true, numeroPaciente: true } },
        _count: { select: { sessoes: true } }
      },
      orderBy: { criadoEm: 'desc' },
    });
  },

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<unknown[]> {
    return prisma.planoTratamento.findMany({
      where: { clinicaId, pacienteId },
      include: { 
        tipoTratamento: true,
        _count: { select: { sessoes: true } }
      },
      orderBy: { criadoEm: 'desc' }
    });
  },

  async update(clinicaId: string, id: string, data: AtualizarPlanoDto): Promise<unknown> {
    return prisma.planoTratamento.update({
      where: { id, clinicaId },
      data: data as Record<string, unknown>,
      include: { tipoTratamento: true }
    });
  }
};
