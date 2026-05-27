"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agendamentosService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const stateTransitions_1 = require("../utils/stateTransitions");
const slots_service_1 = require("./slots.service");
const notification_service_1 = require("./notification.service");
const notificacoes_service_1 = require("./notificacoes.service");
const queues_1 = require("../lib/queues");
const logger_1 = require("../lib/logger");
const eventBus_1 = require("../lib/eventBus");
const subscricao_service_1 = require("./subscricao.service");
const webhooks_service_1 = require("./webhooks.service");
const types_1 = require("@clinicaplus/types");
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
};
/**
 * Maps a Prisma Agendamento record to an AgendamentoDTO.
 */
function toAgendamentoDTO(a) {
    const dto = {
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
        },
        medicoId: a.medicoId,
        medico: {
            id: a.medico.id,
            clinicaId: a.medico.clinicaId,
            utilizadorId: a.medico.utilizadorId,
            nome: a.medico.nome,
            especialidadeId: a.medico.especialidadeId,
            ordem: a.medico.ordem,
            telefoneDireto: a.medico.telefoneDireto,
            horario: a.medico.horario,
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
        },
        dataHora: a.dataHora.toISOString(),
        duracao: a.duracao,
        tipo: a.tipo,
        estado: a.estado,
        motivoConsulta: a.motivoConsulta || null,
        observacoes: a.observacoes || null,
        triagem: a.triagem ? a.triagem : null,
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
            medicamentos: a.receita.medicamentos,
            observacoes: a.receita.observacoes || null,
            dataEmissao: a.receita.dataEmissao.toISOString(),
            dataValidade: a.receita.dataValidade.toISOString(),
            criadoEm: a.receita.criadoEm.toISOString(),
            atualizadoEm: a.receita.atualizadoEm.toISOString(),
        };
    }
    return dto;
}
exports.agendamentosService = {
    /**
     * Lists appointments for a clinic with filters and pagination.
     */
    async list(clinicaId, query) {
        const { medicoId, pacienteId, estado, tipo, dataInicio, dataFim, page = 1, limit = 20 } = query;
        const where = { clinicaId };
        if (medicoId)
            where.medicoId = medicoId;
        if (pacienteId)
            where.pacienteId = pacienteId;
        if (estado)
            where.estado = estado;
        if (tipo)
            where.tipo = tipo;
        if (dataInicio || dataFim) {
            where.dataHora = {};
            if (dataInicio)
                where.dataHora.gte = new Date(dataInicio);
            if (dataFim)
                where.dataHora.lte = new Date(dataFim);
        }
        const [items, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.agendamento.findMany({
                where,
                select: agendamentoSelect,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { dataHora: 'desc' },
            }),
            prisma_1.prisma.agendamento.count({ where }),
        ]);
        return { items: items.map(toAgendamentoDTO), total, page, limit };
    },
    /**
     * Returns appointments for the current day.
     */
    async getHoje(clinicaId, medicoId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const appointments = await prisma_1.prisma.agendamento.findMany({
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
    async getMeus(utilizadorId, clinicaId, query) {
        // First, find the patient ID for this user
        const paciente = await prisma_1.prisma.paciente.findFirst({
            where: { utilizadorId, clinicaId },
        });
        if (!paciente) {
            return { items: [], total: 0, page: query.page || 1, limit: query.limit || 20 };
        }
        return exports.agendamentosService.list(clinicaId, {
            ...query,
            pacienteId: paciente.id,
        });
    },
    /**
     * Returns a single appointment by ID, enforcing clinic ownership.
     */
    async getOne(id, clinicaId) {
        const a = await prisma_1.prisma.agendamento.findUnique({
            where: { id },
            select: agendamentoSelect,
        });
        if (!a || a.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Agendamento não encontrado', 404, 'NOT_FOUND');
        }
        return toAgendamentoDTO(a);
    },
    /**
     * Creates a new appointment, validates slot availability, and sets up reminders.
     */
    async create(data, clinicaId) {
        await subscricao_service_1.subscricaoService.verificarLimite(clinicaId, 'consultas');
        const dataHora = new Date(data.dataHora);
        const duracao = data.duracao ?? 30;
        // Validate if medico and paciente belong to this clinica
        const medico = await prisma_1.prisma.medico.findUnique({ where: { id: data.medicoId } });
        const paciente = await prisma_1.prisma.paciente.findUnique({ where: { id: data.pacienteId } });
        if (!medico || medico.clinicaId !== clinicaId || !paciente || paciente.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Médico ou paciente não encontrado', 404, 'NOT_FOUND');
        }
        // 1. Check slot availability
        const available = await (0, slots_service_1.isSlotAvailable)(data.medicoId, dataHora, duracao, clinicaId);
        if (!available) {
            throw new AppError_1.AppError('Horário não disponível', 409, 'SLOT_NOT_AVAILABLE');
        }
        // 2. Create appointment and reminders in a transaction
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Build explicit create payload
            const createData = {
                clinicaId,
                pacienteId: data.pacienteId,
                medicoId: data.medicoId,
                dataHora,
                duracao,
                tipo: data.tipo,
                motivoConsulta: data.motivoConsulta ?? null,
                observacoes: data.observacoes ?? null,
                estado: (data.estado || 'PENDENTE'),
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
        const finalAgendamento = await prisma_1.prisma.agendamento.findUnique({
            where: { id: result.id },
            select: {
                ...agendamentoSelect,
                clinica: { select: { nome: true } }
            }
        });
        if (!finalAgendamento) {
            throw new AppError_1.AppError('Erro ao recuperar agendamento criado', 500, 'INTERNAL_ERROR');
        }
        // Create DTO for return and notification
        const dto = toAgendamentoDTO(finalAgendamento);
        // 3. Fire-and-forget communications
        if (finalAgendamento.estado === 'CONFIRMADO') {
            Promise.resolve().then(async () => {
                await notification_service_1.notificationService.sendConfirmacaoAgendamento({
                    pacienteEmail: dto.paciente.email || '',
                    pacienteNome: dto.paciente.nome,
                    medicoNome: dto.medico.nome,
                    clinicaNome: finalAgendamento.clinica.nome,
                    dataHora,
                    tipo: dto.tipo,
                    clinicaId,
                });
                // Schedule background reminders via BullMQ
                const now = new Date();
                const delay24h = dataHora.getTime() - 24 * 60 * 60 * 1000 - now.getTime();
                const delay2h = dataHora.getTime() - 2 * 60 * 60 * 1000 - now.getTime();
                if (delay24h > 0) {
                    await queues_1.reminderQueue.add('reminder-24h', { agendamentoId: dto.id, tipo: '24h' }, { jobId: `reminder-24h-${dto.id}`, delay: delay24h, attempts: 3, backoff: { type: 'exponential', delay: 3600000 } });
                }
                if (delay2h > 0) {
                    await queues_1.reminderQueue.add('reminder-2h', { agendamentoId: dto.id, tipo: '2h' }, { jobId: `reminder-2h-${dto.id}`, delay: delay2h, attempts: 3, backoff: { type: 'exponential', delay: 3600000 } });
                }
                // Notify Doctor
                const medico = await prisma_1.prisma.medico.findUnique({ where: { id: data.medicoId }, select: { utilizadorId: true } });
                if (medico) {
                    await notificacoes_service_1.notificacoesService.create({
                        utilizadorId: medico.utilizadorId,
                        titulo: 'Novo Agendamento',
                        mensagem: `Novo agendamento para ${finalAgendamento.paciente.nome} em ${dto.dataHora}`,
                        tipo: 'AGENDAMENTO',
                        url: `/medico/agenda`
                    });
                }
                // Notify Patient if they have an account
                if (finalAgendamento.paciente.utilizadorId) {
                    await notificacoes_service_1.notificacoesService.create({
                        utilizadorId: finalAgendamento.paciente.utilizadorId,
                        titulo: 'Agendamento Confirmado',
                        mensagem: `O seu agendamento para ${dto.dataHora} foi confirmado.`,
                        tipo: 'SUCESSO',
                        url: `/paciente/agendamentos`
                    });
                }
            }).catch(err => logger_1.logger.error({ err }, 'Failed to trigger post-create notifications'));
        }
        // 4. Notify Receptionists
        const receptionists = await prisma_1.prisma.utilizador.findMany({
            where: {
                clinicaId,
                papel: 'RECEPCIONISTA',
                ativo: true
            },
            select: { id: true }
        });
        for (const recep of receptionists) {
            await notificacoes_service_1.notificacoesService.create({
                utilizadorId: recep.id,
                titulo: 'Novo Agendamento',
                mensagem: `Novo agendamento para ${finalAgendamento.paciente.nome} em ${dto.dataHora}`,
                tipo: 'AGENDAMENTO',
                url: `/recepcao/agendamentos`
            }).catch(err => logger_1.logger.error({ err, userId: recep.id }, 'Failed to notify receptionist of new appointment'));
        }
        // 5. Publish real-time event
        // 6. Trigger Webhooks
        webhooks_service_1.webhooksService.trigger(types_1.EventoWebhook.AGENDAMENTO_CRIADO, dto, clinicaId);
        return dto;
    },
    /**
     * Updates an appointment's state after validating the transition.
     */
    async updateEstado(id, clinicaId, data, canceladoPorId) {
        const existing = await prisma_1.prisma.agendamento.findUnique({ where: { id } });
        if (!existing || existing.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Agendamento não encontrado', 404, 'NOT_FOUND');
        }
        if (!(0, stateTransitions_1.isTransitionAllowed)(existing.estado, data.estado)) {
            throw new AppError_1.AppError('Transição de estado inválida', 409, 'INVALID_STATE_TRANSITION');
        }
        const updateData = {
            estado: data.estado,
        };
        if (data.estado === 'CANCELADO') {
            updateData.canceladoPor = canceladoPorId || 'Sistema';
            updateData.canceladoEm = new Date();
            if (data.motivo) {
                updateData.observacoes = `Cancelamento: ${data.motivo}`;
            }
        }
        const updated = await prisma_1.prisma.agendamento.update({
            where: { id },
            data: updateData,
            select: {
                ...agendamentoSelect,
                clinica: { select: { nome: true } }
            }
        });
        const dto = toAgendamentoDTO(updated);
        const clinicaNome = updated.clinica.nome;
        // 3. Handle post-update side effects
        if (data.estado === 'CONFIRMADO') {
            Promise.resolve().then(async () => {
                await notification_service_1.notificationService.sendConfirmacaoAgendamento({
                    pacienteEmail: dto.paciente.email || '',
                    pacienteNome: dto.paciente.nome,
                    medicoNome: dto.medico.nome,
                    clinicaNome,
                    dataHora: new Date(dto.dataHora),
                    tipo: dto.tipo,
                    clinicaId,
                });
                // Schedule background reminders via BullMQ
                const now = new Date();
                const dataHora = new Date(dto.dataHora);
                const delay24h = dataHora.getTime() - 24 * 60 * 60 * 1000 - now.getTime();
                const delay2h = dataHora.getTime() - 2 * 60 * 60 * 1000 - now.getTime();
                if (delay24h > 0) {
                    await queues_1.reminderQueue.add('reminder-24h', { agendamentoId: dto.id, tipo: '24h' }, { jobId: `reminder-24h-${dto.id}`, delay: delay24h, attempts: 3, backoff: { type: 'exponential', delay: 3600000 } });
                }
                if (delay2h > 0) {
                    await queues_1.reminderQueue.add('reminder-2h', { agendamentoId: dto.id, tipo: '2h' }, { jobId: `reminder-2h-${dto.id}`, delay: delay2h, attempts: 3, backoff: { type: 'exponential', delay: 3600000 } });
                }
                // Notify Patient if confirmed
                if (updated.paciente.utilizadorId) {
                    await notificacoes_service_1.notificacoesService.create({
                        utilizadorId: updated.paciente.utilizadorId,
                        titulo: 'Agendamento Confirmado',
                        mensagem: `O seu agendamento para ${dto.dataHora} foi confirmado.`,
                        tipo: 'SUCESSO',
                        url: `/paciente/agendamentos`
                    });
                }
                // Notify Receptionists if confirmed
                const receptionists = await prisma_1.prisma.utilizador.findMany({
                    where: { clinicaId, papel: 'RECEPCIONISTA', ativo: true },
                    select: { id: true }
                });
                for (const recep of receptionists) {
                    await notificacoes_service_1.notificacoesService.create({
                        utilizadorId: recep.id,
                        titulo: 'Agendamento Confirmado',
                        mensagem: `O agendamento de ${dto.paciente.nome} para ${dto.dataHora} foi confirmado.`,
                        tipo: 'AGENDAMENTO',
                        url: `/recepcao/agendamentos`
                    }).catch(err => logger_1.logger.error({ err, userId: recep.id }, 'Failed to notify receptionist of confirmation'));
                }
            }).catch(err => logger_1.logger.error({ err }, 'Failed to trigger post-confirmation notifications'));
        }
        else if (data.estado === 'CANCELADO') {
            // Cancel pending reminders
            Promise.resolve().then(async () => {
                await prisma_1.prisma.lembreteAgendamento.updateMany({
                    where: { agendamentoId: id, enviadoEm: null },
                    data: { enviadoEm: new Date(), sucesso: false, erro: 'Cancelled by user/system' }
                });
                // Remove from background queue
                await queues_1.reminderQueue.remove(`reminder-24h-${id}`);
                await queues_1.reminderQueue.remove(`reminder-2h-${id}`);
                await notification_service_1.notificationService.sendCancelamento({
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
                    await notificacoes_service_1.notificacoesService.create({
                        utilizadorId: updated.paciente.utilizadorId,
                        titulo: 'Agendamento Cancelado',
                        mensagem: `O seu agendamento para ${dto.dataHora} foi cancelado.`,
                        tipo: 'AVISO',
                        url: `/paciente/agendamentos`
                    });
                }
                // Notify Doctor
                const medico = await prisma_1.prisma.medico.findUnique({ where: { id: dto.medicoId }, select: { utilizadorId: true } });
                if (medico) {
                    await notificacoes_service_1.notificacoesService.create({
                        utilizadorId: medico.utilizadorId,
                        titulo: 'Agendamento Cancelado',
                        mensagem: `O agendamento de ${dto.paciente.nome} para ${dto.dataHora} foi cancelado.`,
                        tipo: 'ERRO'
                    });
                }
            }).catch(err => logger_1.logger.error({ err }, 'Failed to trigger post-cancellation notifications'));
        }
        // 4. Publish real-time event
        // 5. Trigger Webhooks
        if (data.estado === 'CONFIRMADO') {
            webhooks_service_1.webhooksService.trigger(types_1.EventoWebhook.AGENDAMENTO_CONFIRMADO, dto, clinicaId);
        }
        else if (data.estado === 'CANCELADO') {
            webhooks_service_1.webhooksService.trigger(types_1.EventoWebhook.AGENDAMENTO_CANCELADO, dto, clinicaId);
        }
        else if (data.estado === 'CONCLUIDO') {
            webhooks_service_1.webhooksService.trigger(types_1.EventoWebhook.AGENDAMENTO_CONCLUIDO, dto, clinicaId);
        }
        return dto;
    },
    /**
     * Registers triage data and advances state to EM_PROGRESSO.
     * Only allowed if current state is CONFIRMADO.
     */
    async registarTriagem(id, clinicaId, data) {
        const existing = await prisma_1.prisma.agendamento.findUnique({ where: { id } });
        if (!existing || existing.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Agendamento não encontrado', 404, 'NOT_FOUND');
        }
        if (existing.estado !== 'CONFIRMADO') {
            throw new AppError_1.AppError('A triagem só pode ser registada para agendamentos confirmados', 409, 'INVALID_STATE');
        }
        const triagemData = { ...data };
        if (triagemData.peso && triagemData.altura) {
            const alturaMetros = triagemData.altura / 100;
            triagemData.imc = parseFloat((triagemData.peso / (alturaMetros * alturaMetros)).toFixed(2));
        }
        const updated = await prisma_1.prisma.agendamento.update({
            where: { id },
            data: {
                triagem: triagemData,
                estado: 'EM_PROGRESSO',
            },
            select: agendamentoSelect,
        });
        const dto = toAgendamentoDTO(updated);
        // Publish real-time event
        try {
            await (0, eventBus_1.publishEvent)(`clinica:${clinicaId}`, 'agendamento:triagem', {
                agendamentoId: dto.id
            });
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Failed to publish agendamento:triagem event');
        }
        return dto;
    },
    /**
     * Saves consultation notes and optionally finalizes.
     * Auto-save (finalizar=false): updates notes/diagnosis only, no state change.
     * Finalize (finalizar=true): updates notes/diagnosis AND sets state to CONCLUIDO.
     */
    async registarConsulta(id, clinicaId, data) {
        const existing = await prisma_1.prisma.agendamento.findUnique({ where: { id } });
        if (!existing || existing.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Agendamento não encontrado', 404, 'NOT_FOUND');
        }
        const shouldFinalize = data.finalizar === true;
        if (shouldFinalize) {
            // Finalization: only allowed from EM_PROGRESSO
            if (existing.estado !== 'EM_PROGRESSO') {
                throw new AppError_1.AppError('A consulta só pode ser finalizada se estiver em progresso', 409, 'INVALID_STATE');
            }
        }
        else {
            // Auto-save: allowed from any non-terminal state
            const terminalStates = ['CANCELADO', 'NAO_COMPARECEU'];
            if (terminalStates.includes(existing.estado)) {
                throw new AppError_1.AppError('Não é possível salvar notas neste estado', 409, 'INVALID_STATE');
            }
        }
        const updateData = {
            notasConsulta: data.notasConsulta ?? null,
            diagnostico: data.diagnostico ?? null,
            ...(shouldFinalize ? { estado: 'CONCLUIDO' } : {}),
        };
        const updated = await prisma_1.prisma.agendamento.update({
            where: { id },
            data: updateData,
            select: agendamentoSelect,
        });
        // If finalising, create a Prontuario entry
        if (shouldFinalize) {
            await prisma_1.prisma.prontuario.create({
                data: {
                    clinicaId,
                    pacienteId: existing.pacienteId,
                    medicoId: existing.medicoId,
                    agendamentoId: id,
                    notas: data.notasConsulta || '',
                    diagnostico: data.diagnostico || null,
                }
            }).catch(err => logger_1.logger.error({ err, agendamentoId: id }, 'Failed to create prontuario entry after finalising consultation'));
        }
        const dto = toAgendamentoDTO(updated);
        // Trigger Webhooks
        if (shouldFinalize) {
            webhooks_service_1.webhooksService.trigger(types_1.EventoWebhook.AGENDAMENTO_CONCLUIDO, dto, clinicaId);
        }
        return dto;
    },
};
