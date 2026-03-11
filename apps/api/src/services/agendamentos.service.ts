import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { isTransitionAllowed } from '../utils/stateTransitions';
import { isSlotAvailable } from './slots.service';
import { notificationService } from './notification.service';
import type {
  AgendamentoCreateInput,
  AgendamentoUpdateEstadoInput,
  TriagemInput,
  ConsultaInput,
  AgendamentoDTO,
  AgendamentoListQuery,
  PaginatedResponse,
  MedicoDTO,
  ReceitaDTO,
} from '@clinicaplus/types';
import { EstadoAgendamento } from '@clinicaplus/types';
import type { Prisma } from '@prisma/client';
import { schedulerService } from './scheduler.service';
import { notificacoesService } from './notificacoes.service';
import { logger } from '../lib/logger';

/**
 * Shared Prisma select clause — fetches only columns needed by `toAgendamentoDTO`.
 * Avoids over-fetching whole `paciente` and `medico` relations.
 */
const agendamentoSelect = {
  id: true,
  clinicaId: true,
  pacienteId: true,
  medicoId: true,
  dataHora: true,
  duracao: true,
  tipo: true,
  estado: true,
  motivoConsulta: true,
  observacoes: true,
  triagem: true,
  notasConsulta: true,
  diagnostico: true,
  canceladoPor: true,
  canceladoEm: true,
  criadoEm: true,
  atualizadoEm: true,
  paciente: {
    select: {
      id: true,
      clinicaId: true,
      utilizadorId: true,
      numeroPaciente: true,
      nome: true,
      genero: true,
      dataNascimento: true,
      tipoSangue: true,
      alergias: true,
      telefone: true,
      email: true,
      endereco: true,
      provincia: true,
      seguroSaude: true,
      seguradora: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  },
  medico: {
    select: {
      id: true,
      clinicaId: true,
      utilizadorId: true,
      nome: true,
      ordem: true,
      especialidadeId: true,
      especialidade: true,
      telefoneDireto: true,
      horario: true,
      duracaoConsulta: true,
      preco: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  },
  receita: true,
} satisfies Prisma.AgendamentoSelect;

/**
 * Type representing an Agendamento with its relations, based on agendamentoSelect.
 * We use this to satisfy the toAgendamentoDTO input.
 */
type AgendamentoWithRelations = Prisma.AgendamentoGetPayload<{ select: typeof agendamentoSelect }>;

/**
 * Maps a Prisma Agendamento record to an AgendamentoDTO.
 */
function toAgendamentoDTO(a: AgendamentoWithRelations): AgendamentoDTO {
  const dto: AgendamentoDTO = {
    id: a.id,
    clinicaId: a.clinicaId,
    pacienteId: a.pacienteId,
    paciente: {
      ...a.paciente,
      utilizadorId: a.paciente.utilizadorId || null,
      tipoSangue: a.paciente.tipoSangue || null,
      telefone: a.paciente.telefone || null,
      email: a.paciente.email || null,
      endereco: a.paciente.endereco || null,
      provincia: a.paciente.provincia || null,
      seguradora: a.paciente.seguradora || null,
      dataNascimento: a.paciente.dataNascimento.toISOString(),
      criadoEm: a.paciente.criadoEm.toISOString(),
      atualizadoEm: a.paciente.atualizadoEm.toISOString(),
    } as AgendamentoDTO['paciente'],
    medicoId: a.medicoId,
    medico: {
      id: a.medico.id,
      clinicaId: a.medico.clinicaId,
      utilizadorId: a.medico.utilizadorId,
      nome: a.medico.nome,
      especialidadeId: a.medico.especialidadeId,
      ordem: a.medico.ordem,
      telefoneDireto: a.medico.telefoneDireto,
      horario: a.medico.horario as unknown as AgendamentoDTO['medico']['horario'],
      duracaoConsulta: a.medico.duracaoConsulta,
      preco: a.medico.preco,
      ativo: a.medico.ativo,
      criadoEm: a.medico.criadoEm.toISOString(),
      atualizadoEm: a.medico.atualizadoEm.toISOString(),
      ...(a.medico.especialidade ? {
        especialidade: {
          ...a.medico.especialidade,
          descricao: a.medico.especialidade.descricao || null,
          criadoEm: a.medico.especialidade.criadoEm.toISOString(),
          atualizadoEm: a.medico.especialidade.atualizadoEm.toISOString(),
        }
      } : {}),
    } as unknown as MedicoDTO,
    dataHora: a.dataHora.toISOString(),
    duracao: a.duracao,
    tipo: a.tipo as AgendamentoDTO['tipo'],
    estado: a.estado as AgendamentoDTO['estado'],
    motivoConsulta: a.motivoConsulta || null,
    observacoes: a.observacoes || null,
    triagem: a.triagem ? (a.triagem as unknown as AgendamentoDTO['triagem']) : null,
    notasConsulta: a.notasConsulta || null,
    diagnostico: a.diagnostico || null,
    canceladoPor: a.canceladoPor || null,
    canceladoEm: a.canceladoEm ? a.canceladoEm.toISOString() : null,
    criadoEm: a.criadoEm.toISOString(),
    atualizadoEm: a.atualizadoEm.toISOString(),
  };

  if (a.receita) {
    dto.receita = {
      id: a.receita.id,
      agendamentoId: a.receita.agendamentoId,
      clinicaId: a.receita.clinicaId,
      pacienteId: a.receita.pacienteId,
      medicoId: a.receita.medicoId,
      diagnostico: a.receita.diagnostico,
      medicamentos: a.receita.medicamentos as unknown as ReceitaDTO['medicamentos'],
      observacoes: a.receita.observacoes || null,
      dataEmissao: a.receita.dataEmissao.toISOString(),
      dataValidade: a.receita.dataValidade.toISOString(),
      criadoEm: a.receita.criadoEm.toISOString(),
      atualizadoEm: a.receita.atualizadoEm.toISOString(),
    };
  }

  return dto;
}

export const agendamentosService = {
  /**
   * Lists appointments for a clinic with filters and pagination.
   */
  async list(
    clinicaId: string,
    query: AgendamentoListQuery
  ): Promise<PaginatedResponse<AgendamentoDTO>> {
    const { medicoId, pacienteId, estado, tipo, dataInicio, dataFim, page = 1, limit = 20 } = query;

    const where: Prisma.AgendamentoWhereInput = { clinicaId };
    if (medicoId) where.medicoId = medicoId;
    if (pacienteId) where.pacienteId = pacienteId;
    if (estado) where.estado = estado as unknown as Prisma.AgendamentoWhereInput['estado'] & {};
    if (tipo) where.tipo = tipo as unknown as Prisma.AgendamentoWhereInput['tipo'] & {};
    if (dataInicio || dataFim) {
      where.dataHora = {};
      if (dataInicio) where.dataHora.gte = new Date(dataInicio);
      if (dataFim) where.dataHora.lte = new Date(dataFim);
    }

    const [items, total] = await prisma.$transaction([
      prisma.agendamento.findMany({
        where,
        select: agendamentoSelect,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dataHora: 'desc' },
      }),
      prisma.agendamento.count({ where }),
    ]);

    return { items: items.map(toAgendamentoDTO), total, page, limit };
  },

  /**
   * Returns appointments for the current day.
   */
  async getHoje(clinicaId: string, medicoId?: string): Promise<AgendamentoDTO[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await prisma.agendamento.findMany({
      where: {
        clinicaId,
        ...(medicoId && { medicoId }),
        dataHora: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: agendamentoSelect,
      orderBy: { dataHora: 'asc' },
    });

    return appointments.map(toAgendamentoDTO);
  },

  /**
   * Returns appointments for a specific patient.
   */
  async getMeus(
    utilizadorId: string,
    clinicaId: string,
    query: AgendamentoListQuery
  ): Promise<PaginatedResponse<AgendamentoDTO>> {
    // First, find the patient ID for this user
    const paciente = await prisma.paciente.findFirst({
      where: { utilizadorId, clinicaId },
    });

    if (!paciente) {
      return { items: [], total: 0, page: query.page || 1, limit: query.limit || 20 };
    }

    return agendamentosService.list(clinicaId, {
      ...query,
      pacienteId: paciente.id,
    });
  },

  /**
   * Returns a single appointment by ID, enforcing clinic ownership.
   */
  async getOne(id: string, clinicaId: string): Promise<AgendamentoDTO> {
    const a = await prisma.agendamento.findUnique({ 
      where: { id },
      select: agendamentoSelect,
    });
    if (!a || a.clinicaId !== clinicaId) {
      throw new AppError('Agendamento não encontrado', 404, 'NOT_FOUND');
    }
    return toAgendamentoDTO(a);
  },

  /**
   * Creates a new appointment, validates slot availability, and sets up reminders.
   */
  async create(data: AgendamentoCreateInput, clinicaId: string): Promise<AgendamentoDTO> {
    const dataHora = new Date(data.dataHora);
    const duracao = data.duracao ?? 30;

    // Validate if medico and paciente belong to this clinica
    const medico = await prisma.medico.findUnique({ where: { id: data.medicoId } });
    const paciente = await prisma.paciente.findUnique({ where: { id: data.pacienteId } });

    if (!medico || medico.clinicaId !== clinicaId || !paciente || paciente.clinicaId !== clinicaId) {
      throw new AppError('Médico ou paciente não encontrado', 404, 'NOT_FOUND');
    }

    // 1. Check slot availability
    const available = await isSlotAvailable(data.medicoId, dataHora, duracao, clinicaId);
    if (!available) {
      throw new AppError('Horário não disponível', 409, 'SLOT_NOT_AVAILABLE');
    }

    // 2. Create appointment and reminders in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Build explicit create payload
      const createData: Prisma.AgendamentoUncheckedCreateInput = {
        clinicaId,
        pacienteId: data.pacienteId,
        medicoId: data.medicoId,
        dataHora,
        duracao,
        tipo: data.tipo,
        motivoConsulta: data.motivoConsulta ?? null,
        observacoes: data.observacoes ?? null,
        estado: (data as any).estado || 'PENDENTE',
      };

      const agendamento = await tx.agendamento.create({
        data: createData,
        include: { clinica: true }
      });

      // Fetch clinic configuration for reminders
      const config = await tx.configuracaoClinica.findUnique({
        where: { clinicaId },
      });

      if (config) {
        if (config.lembrete24h) {
          const sendAt = new Date(dataHora.getTime() - 24 * 60 * 60 * 1000);
          if (sendAt > new Date()) {
            await tx.lembreteAgendamento.create({
              data: {
                clinicaId,
                agendamentoId: agendamento.id,
                tipo: 'H24',
                agendadoPara: sendAt,
              },
            });
          }
        }

        if (config.lembrete2h) {
          const sendAt = new Date(dataHora.getTime() - 2 * 60 * 60 * 1000);
          if (sendAt > new Date()) {
            await tx.lembreteAgendamento.create({
              data: {
                clinicaId,
                agendamentoId: agendamento.id,
                tipo: 'H2',
                agendadoPara: sendAt,
              },
            });
          }
        }
      }

      return agendamento;
    });
    
    // Fetch full record with relations for the DTO
    const finalAgendamento = await prisma.agendamento.findUnique({
      where: { id: result.id },
      select: {
        ...agendamentoSelect,
        clinica: { select: { nome: true } }
      }
    });

    if (!finalAgendamento) {
      throw new AppError('Erro ao recuperar agendamento criado', 500, 'INTERNAL_ERROR');
    }
    // Create DTO for return and notification
    const dto = toAgendamentoDTO(finalAgendamento as unknown as AgendamentoWithRelations);

    // 3. Fire-and-forget communications
    if (finalAgendamento.estado === 'CONFIRMADO') {
      Promise.resolve().then(async () => {
        await notificationService.sendConfirmacaoAgendamento({
          pacienteEmail: dto.paciente.email || '',
          pacienteNome: dto.paciente.nome,
          medicoNome: dto.medico.nome,
          clinicaNome: finalAgendamento.clinica.nome,
          dataHora,
          tipo: dto.tipo,
          clinicaId,
        });
        await schedulerService.scheduleReminders(dto.id, clinicaId, dataHora);
        
        // Notify Doctor
        const medico = await prisma.medico.findUnique({ where: { id: data.medicoId }, select: { utilizadorId: true } });
        if (medico) {
          await notificacoesService.create({
            utilizadorId: medico.utilizadorId,
            titulo: 'Novo Agendamento',
            mensagem: `Novo agendamento para ${finalAgendamento.paciente.nome} em ${dto.dataHora}`,
            tipo: 'AGENDAMENTO',
            url: `/medico/agenda`
          });
        }

        // Notify Patient if they have an account
        if (finalAgendamento.paciente.utilizadorId) {
          await notificacoesService.create({
            utilizadorId: finalAgendamento.paciente.utilizadorId,
            titulo: 'Agendamento Confirmado',
            mensagem: `O seu agendamento para ${dto.dataHora} foi confirmado.`,
            tipo: 'SUCESSO',
            url: `/paciente/agendamentos`
          });
        }
      }).catch(err => logger.error({ err }, 'Failed to trigger post-create notifications'));
    }

    return dto;
  },

  /**
   * Updates an appointment's state after validating the transition.
   */
  async updateEstado(
    id: string,
    clinicaId: string,
    data: AgendamentoUpdateEstadoInput,
    canceladoPorId?: string
  ): Promise<AgendamentoDTO> {
    const existing = await prisma.agendamento.findUnique({ where: { id } });
    if (!existing || existing.clinicaId !== clinicaId) {
      throw new AppError('Agendamento não encontrado', 404, 'NOT_FOUND');
    }

    if (!isTransitionAllowed(existing.estado as EstadoAgendamento, data.estado)) {
      throw new AppError('Transição de estado inválida', 409, 'INVALID_STATE_TRANSITION');
    }

    const updateData: Record<string, unknown> = {
      estado: data.estado,
    };
    if (data.estado === 'CANCELADO') {
      updateData.canceladoPor = canceladoPorId || 'Sistema';
      updateData.canceladoEm = new Date();
      if (data.motivo) {
        updateData.observacoes = `Cancelamento: ${data.motivo}`;
      }
    }

    const updated = await prisma.agendamento.update({
      where: { id },
      data: updateData,
      select: {
        ...agendamentoSelect,
        clinica: { select: { nome: true } }
      }
    });
 
    const dto = toAgendamentoDTO(updated as AgendamentoWithRelations);
    const clinicaNome = updated.clinica.nome;

    // 3. Handle post-update side effects
    if (data.estado === 'CONFIRMADO') {
      Promise.resolve().then(async () => {
        await notificationService.sendConfirmacaoAgendamento({
          pacienteEmail: dto.paciente.email || '',
          pacienteNome: dto.paciente.nome,
          medicoNome: dto.medico.nome,
          clinicaNome,
          dataHora: new Date(dto.dataHora),
          tipo: dto.tipo,
          clinicaId,
        });
        
        await schedulerService.scheduleReminders(dto.id, clinicaId, new Date(dto.dataHora));
        
        // Notify Patient if confirmed
        if (updated.paciente.utilizadorId) {
          await notificacoesService.create({
            utilizadorId: updated.paciente.utilizadorId,
            titulo: 'Agendamento Confirmado',
            mensagem: `O seu agendamento para ${dto.dataHora} foi confirmado.`,
            tipo: 'SUCESSO',
            url: `/paciente/agendamentos`
          });
        }
      }).catch(err => logger.error({ err }, 'Failed to trigger post-confirmation notifications'));
    } else if (data.estado === 'CANCELADO') {
      // Cancel pending reminders
      Promise.resolve().then(async () => {
        await prisma.lembreteAgendamento.updateMany({
          where: { agendamentoId: id, enviadoEm: null },
          data: { enviadoEm: new Date(), sucesso: false, erro: 'Cancelled by user/system' }
        });

        await notificationService.sendCancelamento({
          pacienteEmail: dto.paciente.email || '',
          pacienteNome: dto.paciente.nome,
          medicoNome: dto.medico.nome,
          clinicaNome,
          dataHora: new Date(dto.dataHora),
          clinicaId,
          ...(data.motivo && { motivo: data.motivo }),
        });

        // Notify Patient if cancelled
        if (updated.paciente.utilizadorId) {
          await notificacoesService.create({
            utilizadorId: updated.paciente.utilizadorId,
            titulo: 'Agendamento Cancelado',
            mensagem: `O seu agendamento para ${dto.dataHora} foi cancelado.`,
            tipo: 'AVISO',
            url: `/paciente/agendamentos`
          });
        }

        // Notify Doctor
        const medico = await prisma.medico.findUnique({ where: { id: dto.medicoId }, select: { utilizadorId: true } });
        if (medico) {
          await notificacoesService.create({
            utilizadorId: medico.utilizadorId,
            titulo: 'Agendamento Cancelado',
            mensagem: `O agendamento de ${dto.paciente.nome} para ${dto.dataHora} foi cancelado.`,
            tipo: 'ERRO'
          });
        }
      }).catch(err => logger.error({ err }, 'Failed to trigger post-cancellation notifications'));
    }

    return dto;
  },

  /**
   * Registers triage data and advances state to EM_PROGRESSO.
   * Only allowed if current state is CONFIRMADO.
   */
  async registarTriagem(
    id: string,
    clinicaId: string,
    data: TriagemInput
  ): Promise<AgendamentoDTO> {
    const existing = await prisma.agendamento.findUnique({ where: { id } });
    if (!existing || existing.clinicaId !== clinicaId) {
      throw new AppError('Agendamento não encontrado', 404, 'NOT_FOUND');
    }

    if (existing.estado !== 'CONFIRMADO') {
      throw new AppError('A triagem só pode ser registada para agendamentos confirmados', 409, 'INVALID_STATE');
    }

    const triagemData = { ...data };
    if (triagemData.peso && triagemData.altura) {
      const alturaMetros = triagemData.altura / 100;
      triagemData.imc = parseFloat((triagemData.peso / (alturaMetros * alturaMetros)).toFixed(2));
    }

    const updated = await prisma.agendamento.update({
      where: { id },
      data: {
        triagem: triagemData as Prisma.InputJsonValue,
        estado: 'EM_PROGRESSO',
      },
      select: agendamentoSelect,
    });

    return toAgendamentoDTO(updated);
  },

  /**
   * Saves consultation notes and optionally finalizes.
   * Auto-save (finalizar=false): updates notes/diagnosis only, no state change.
   * Finalize (finalizar=true): updates notes/diagnosis AND sets state to CONCLUIDO.
   */
  async registarConsulta(
    id: string,
    clinicaId: string,
    data: ConsultaInput
  ): Promise<AgendamentoDTO> {
    const existing = await prisma.agendamento.findUnique({ where: { id } });
    if (!existing || existing.clinicaId !== clinicaId) {
      throw new AppError('Agendamento não encontrado', 404, 'NOT_FOUND');
    }

    const shouldFinalize = data.finalizar === true;

    if (shouldFinalize) {
      // Finalization: only allowed from EM_PROGRESSO
      if (existing.estado !== 'EM_PROGRESSO') {
        throw new AppError('A consulta só pode ser finalizada se estiver em progresso', 409, 'INVALID_STATE');
      }
    } else {
      // Auto-save: allowed from any non-terminal state
      const terminalStates = ['CANCELADO', 'NAO_COMPARECEU'];
      if (terminalStates.includes(existing.estado)) {
        throw new AppError('Não é possível salvar notas neste estado', 409, 'INVALID_STATE');
      }
    }

    const updateData: Prisma.AgendamentoUpdateInput = {
      notasConsulta: data.notasConsulta ?? null,
      diagnostico: data.diagnostico ?? null,
      ...(shouldFinalize ? { estado: 'CONCLUIDO' } : {}),
    };

    const updated = await prisma.agendamento.update({
      where: { id },
      data: updateData,
      select: agendamentoSelect,
    });

    // If finalising, create a Prontuario entry
    if (shouldFinalize) {
      await prisma.prontuario.create({
        data: {
          clinicaId,
          pacienteId: existing.pacienteId,
          medicoId: existing.medicoId,
          agendamentoId: id,
          notas: data.notasConsulta || '',
          diagnostico: data.diagnostico || null,
        }
      }).catch(err => logger.error({ err, agendamentoId: id }, 'Failed to create prontuario entry after finalising consultation'));
    }

    return toAgendamentoDTO(updated as unknown as AgendamentoWithRelations);
  },
};
