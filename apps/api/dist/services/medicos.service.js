"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicosService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const logger_1 = require("../lib/logger");
const slots_service_1 = require("./slots.service");
const utils_1 = require("@clinicaplus/utils");
const notification_service_1 = require("./notification.service");
const subscricao_service_1 = require("./subscricao.service");
const types_1 = require("@clinicaplus/types");
const DEFAULT_HORARIO_DIA = { ativo: false, inicio: '', fim: '', pausaInicio: '', pausaFim: '' };
const DEFAULT_HORARIO = {
    segunda: DEFAULT_HORARIO_DIA,
    terca: DEFAULT_HORARIO_DIA,
    quarta: DEFAULT_HORARIO_DIA,
    quinta: DEFAULT_HORARIO_DIA,
    sexta: DEFAULT_HORARIO_DIA,
    sabado: DEFAULT_HORARIO_DIA,
    domingo: DEFAULT_HORARIO_DIA,
};
/**
 * Maps a Prisma Medico to a MedicoDTO.
 */
function toMedicoDTO(m) {
    // Defensive merge: provide defaults for missing days or fields in the horario JSON
    const rawHorario = m.horario || {};
    const mergedHorario = {
        ...DEFAULT_HORARIO,
        ...rawHorario
    };
    const dto = {
        id: m.id,
        clinicaId: m.clinicaId,
        utilizadorId: m.utilizadorId,
        nome: m.nome,
        especialidadeId: m.especialidadeId,
        ordem: m.ordem,
        telefoneDireto: m.telefoneDireto,
        horario: types_1.MedicoHorarioSchema.parse(mergedHorario),
        duracaoConsulta: m.duracaoConsulta,
        preco: m.preco,
        ativo: m.ativo,
        criadoEm: m.criadoEm.toISOString(),
        atualizadoEm: m.atualizadoEm.toISOString(),
    };
    if (m.especialidade) {
        dto.especialidade = {
            id: m.especialidade.id,
            clinicaId: m.especialidade.clinicaId,
            nome: m.especialidade.nome,
            descricao: m.especialidade.descricao,
            ativo: m.especialidade.ativo,
            criadoEm: m.especialidade.criadoEm.toISOString(),
            atualizadoEm: m.especialidade.atualizadoEm.toISOString(),
        };
    }
    return dto;
}
exports.medicosService = {
    /**
     * Lists doctors for a clinic with optional specialty filter, paginated.
     */
    async list(clinicaId, query) {
        const { especialidadeId, ativo, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const where = {
            clinicaId,
            ...(ativo !== undefined && { ativo }),
            ...(especialidadeId && { especialidadeId }),
        };
        const [total, medicos] = await Promise.all([
            prisma_1.prisma.medico.count({ where }),
            prisma_1.prisma.medico.findMany({
                where,
                include: { especialidade: true },
                orderBy: { nome: 'asc' },
                skip,
                take: limit,
            }),
        ]);
        return {
            items: medicos.map(toMedicoDTO),
            total,
            page,
            limit,
        };
    },
    /**
     * Returns the medico linked to a specific utilizadorId (for self-service endpoints).
     */
    async getByUtilizadorId(utilizadorId, clinicaId) {
        const m = await prisma_1.prisma.medico.findFirst({
            where: { utilizadorId, clinicaId },
            include: { especialidade: true },
        });
        if (!m) {
            throw new AppError_1.AppError('Perfil de médico não encontrado para este utilizador', 404, 'NOT_FOUND');
        }
        return toMedicoDTO(m);
    },
    /**
     * Returns a single doctor, enforcing clinicaId ownership.
     */
    async getOne(id, clinicaId) {
        const m = await prisma_1.prisma.medico.findUnique({
            where: { id },
            include: { especialidade: true }
        });
        if (!m || m.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Médico não encontrado', 404, 'NOT_FOUND');
        }
        return toMedicoDTO(m);
    },
    /**
     * Delegates to slotsService for available slots on a given date.
     */
    async getSlots(id, dataStr, clinicaId) {
        // Verify the doctor belongs to the clinic first
        const m = await prisma_1.prisma.medico.findUnique({ where: { id } });
        if (!m || m.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Médico não encontrado', 404, 'NOT_FOUND');
        }
        return (0, slots_service_1.getAvailableSlots)(id, dataStr, clinicaId);
    },
    /**
     * Creates a MEDICO user account + Medico record in a single transaction.
     * Expects either a utilizadorId of an existing Utilizador with MEDICO role,
     * OR creates one using the provided email.
     */
    async create(data, clinicaId) {
        await subscricao_service_1.subscricaoService.verificarLimite(clinicaId, 'medicos');
        let utilizadorId = data.utilizadorId;
        if (!utilizadorId) {
            if (!data.email) {
                throw new AppError_1.AppError('É necessário fornecer um utilizadorId ou um email para criar o médico.', 400, 'VALIDATION_ERROR');
            }
            // Check if email already exists
            // Check if email already exists for this clinic
            const existingUser = await prisma_1.prisma.utilizador.findUnique({
                where: {
                    clinicaId_email: {
                        clinicaId,
                        email: data.email
                    }
                }
            });
            if (existingUser) {
                throw new AppError_1.AppError('Este email já está registado.', 409, 'DUPLICATE_ENTRY');
            }
            // Create new user (Role: MEDICO)
            const clearPassword = (0, utils_1.generateInitialPassword)(10);
            const hashedPassword = await bcryptjs_1.default.hash(clearPassword, 10);
            const newUser = await prisma_1.prisma.utilizador.create({
                data: {
                    clinicaId,
                    nome: data.nome,
                    email: data.email,
                    passwordHash: hashedPassword,
                    papel: 'MEDICO',
                }
            });
            utilizadorId = newUser.id;
            // Send welcome email (fire-and-forget)
            const clinica = await prisma_1.prisma.clinica.findUnique({ where: { id: clinicaId } });
            notification_service_1.notificationService.sendStaffWelcomeEmail({
                email: newUser.email,
                nome: newUser.nome,
                clearPassword,
                papel: newUser.papel,
                clinicaNome: clinica?.nome || 'Clínica',
            }).catch(err => {
                // We log it but do not block the doctor creation
                logger_1.logger.error({ err }, 'Failed to send welcome email to new medico');
            });
        }
        else {
            // Ensure the user exists and belongs to this clinic
            const user = await prisma_1.prisma.utilizador.findUnique({ where: { id: utilizadorId } });
            if (!user || user.clinicaId !== clinicaId) {
                throw new AppError_1.AppError('Utilizador não encontrado nesta clínica', 404, 'NOT_FOUND');
            }
            // Validate that user is not already linked to a Medico
            const alreadyLinked = await prisma_1.prisma.medico.findUnique({
                where: { utilizadorId },
            });
            if (alreadyLinked) {
                throw new AppError_1.AppError('Utilizador já está associado a um médico', 409, 'DUPLICATE_ENTRY');
            }
        }
        const horario = data.horario;
        const m = await prisma_1.prisma.medico.create({
            data: {
                clinicaId,
                utilizadorId,
                nome: data.nome,
                especialidadeId: data.especialidadeId,
                ordem: data.ordem ?? null,
                telefoneDireto: data.telefoneDireto ?? null,
                horario: horario, // Prisma Json type
                duracaoConsulta: data.duracaoConsulta ?? 30,
                preco: data.preco,
                ativo: data.ativo ?? true,
            },
            include: { especialidade: true }
        });
        return toMedicoDTO(m);
    },
    /**
     * Updates editable fields. utilizadorId cannot be changed.
     */
    async update(id, data, clinicaId) {
        const existing = await prisma_1.prisma.medico.findUnique({ where: { id } });
        if (!existing || existing.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Médico não encontrado', 404, 'NOT_FOUND');
        }
        // Build explicit update data to satisfy exactOptionalPropertyTypes
        const updateData = {};
        if (data.nome !== undefined)
            updateData.nome = data.nome;
        if (data.especialidadeId !== undefined)
            updateData.especialidadeId = data.especialidadeId;
        if (data.ordem !== undefined)
            updateData.ordem = data.ordem ?? null;
        if (data.telefoneDireto !== undefined)
            updateData.telefoneDireto = data.telefoneDireto ?? null;
        if (data.horario !== undefined)
            updateData.horario = data.horario;
        if (data.duracaoConsulta !== undefined)
            updateData.duracaoConsulta = data.duracaoConsulta;
        if (data.preco !== undefined)
            updateData.preco = data.preco;
        if (data.ativo !== undefined)
            updateData.ativo = data.ativo;
        const m = await prisma_1.prisma.medico.update({
            where: { id },
            data: updateData,
            include: { especialidade: true }
        });
        return toMedicoDTO(m);
    },
};
