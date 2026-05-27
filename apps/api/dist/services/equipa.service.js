"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.equipaService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const logger_1 = require("../lib/logger");
const utils_1 = require("@clinicaplus/utils");
const notification_service_1 = require("./notification.service");
const auditLog_service_1 = require("./auditLog.service");
/**
 * Maps a Prisma Utilizador to a UtilizadorDTO.
 */
function toUtilizadorDTO(u) {
    return {
        id: u.id,
        clinicaId: u.clinicaId,
        nome: u.nome,
        email: u.email,
        avatarUrl: u.avatarUrl,
        papel: u.papel,
        ativo: u.ativo,
        criadoEm: u.criadoEm.toISOString(),
        atualizadoEm: u.atualizadoEm.toISOString(),
    };
}
exports.equipaService = {
    /**
     * Lists staff users (excluding patients, maybe focusing on ADMIN and RECEPCIONISTA).
     */
    async list(clinicaId, query) {
        const { papel, ativo, q, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const where = {
            clinicaId,
            // Default to non-patient roles if role not specified
            papel: papel || { not: 'PACIENTE' },
            ...(ativo !== undefined && { ativo }),
        };
        if (q) {
            where.OR = [
                { nome: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
            ];
        }
        const [total, utilizadores] = await Promise.all([
            prisma_1.prisma.utilizador.count({ where }),
            prisma_1.prisma.utilizador.findMany({
                where,
                orderBy: { nome: 'asc' },
                skip,
                take: limit,
            }),
        ]);
        return {
            items: utilizadores.map(toUtilizadorDTO),
            total,
            page,
            limit,
        };
    },
    /**
     * Returns a single staff user.
     */
    async getOne(id, clinicaId) {
        const u = await prisma_1.prisma.utilizador.findUnique({ where: { id } });
        if (!u || u.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Utilizador não encontrado', 404, 'NOT_FOUND');
        }
        return toUtilizadorDTO(u);
    },
    /**
     * Creates a new staff user (e.g., RECEPCIONISTA, ADMIN), generates a password,
     * configures the account, and sends a welcome email.
     */
    async create(data, clinicaId, actorId, ip) {
        // Check if email already exists for this clinic
        const existingUser = await prisma_1.prisma.utilizador.findUnique({
            where: {
                clinicaId_email: { clinicaId, email: data.email }
            }
        });
        if (existingUser) {
            throw new AppError_1.AppError('Este email já está registado.', 409, 'DUPLICATE_ENTRY');
        }
        // Role validation: Do not allow MEDICO or PACIENTE through this endpoint.
        // Medicos have special data (specialties, horarios), Patients have their own forms.
        // Role validation: Do not allow PACIENTE through this endpoint.
        if (data.papel === 'PACIENTE') {
            throw new AppError_1.AppError('Este endpoint não suporta a criação de Pacientes.', 400, 'INVALID_ROLE');
        }
        const clearPassword = (0, utils_1.generateInitialPassword)(10);
        const hashedPassword = await bcryptjs_1.default.hash(clearPassword, 10);
        const newUser = await prisma_1.prisma.$transaction(async (tx) => {
            const u = await tx.utilizador.create({
                data: {
                    clinicaId,
                    nome: data.nome,
                    email: data.email,
                    passwordHash: hashedPassword,
                    papel: data.papel,
                    ativo: data.ativo ?? true,
                }
            });
            // Synchronize Medico record if role is MEDICO
            if (u.papel === 'MEDICO') {
                let esp = await tx.especialidade.findFirst({ where: { clinicaId } });
                if (!esp) {
                    esp = await tx.especialidade.create({
                        data: { clinicaId, nome: 'Clínica Geral', descricao: 'Criada automaticamente (Sistema)' }
                    });
                }
                await tx.medico.create({
                    data: {
                        clinicaId,
                        utilizadorId: u.id,
                        nome: u.nome,
                        especialidadeId: esp.id,
                        horario: {
                            "1": { ativo: true, inicio: "08:00", fim: "17:00" },
                            "2": { ativo: true, inicio: "08:00", fim: "17:00" },
                            "3": { ativo: true, inicio: "08:00", fim: "17:00" },
                            "4": { ativo: true, inicio: "08:00", fim: "17:00" },
                            "5": { ativo: true, inicio: "08:00", fim: "17:00" }
                        }
                    }
                });
            }
            return u;
        });
        await auditLog_service_1.auditLogService.log({
            actorId,
            clinicaId,
            accao: 'CREATE',
            recurso: 'utilizador',
            recursoId: newUser.id,
            depois: newUser,
            ip: ip ?? null
        });
        // Send welcome email (fire-and-forget)
        const clinica = await prisma_1.prisma.clinica.findUnique({ where: { id: clinicaId } });
        notification_service_1.notificationService.sendStaffWelcomeEmail({
            email: newUser.email,
            nome: newUser.nome,
            clearPassword,
            papel: newUser.papel,
            clinicaNome: clinica?.nome || '',
        }).catch(err => {
            logger_1.logger.error({ err }, 'Failed to send welcome email to new staff');
        });
        return toUtilizadorDTO(newUser);
    },
    /**
     * Updates editable fields for a staff user.
     */
    async update(id, data, clinicaId, actorId, ip) {
        const existing = await prisma_1.prisma.utilizador.findUnique({ where: { id } });
        if (!existing || existing.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Utilizador não encontrado', 404, 'NOT_FOUND');
        }
        // Prevent changing role to MEDICO or PACIENTE here
        // Prevent changing role to PACIENTE here
        if (data.papel === 'PACIENTE') {
            throw new AppError_1.AppError('Não é possível alterar o papel para Paciente por este meio.', 400, 'INVALID_ROLE');
        }
        const updateData = {};
        if (data.nome !== undefined)
            updateData.nome = data.nome;
        if (data.email !== undefined)
            updateData.email = data.email;
        if (data.papel !== undefined)
            updateData.papel = data.papel;
        if (data.ativo !== undefined)
            updateData.ativo = data.ativo;
        const u = await prisma_1.prisma.$transaction(async (tx) => {
            const updatedUser = await tx.utilizador.update({
                where: { id },
                data: updateData,
            });
            // Synchronize Medico record if role is now MEDICO
            if (updatedUser.papel === 'MEDICO') {
                const existingMedico = await tx.medico.findUnique({ where: { utilizadorId: id } });
                if (!existingMedico) {
                    let esp = await tx.especialidade.findFirst({ where: { clinicaId } });
                    if (!esp) {
                        esp = await tx.especialidade.create({
                            data: { clinicaId, nome: 'Clínica Geral', descricao: 'Criada automaticamente (Sistema)' }
                        });
                    }
                    await tx.medico.create({
                        data: {
                            clinicaId,
                            utilizadorId: updatedUser.id,
                            nome: updatedUser.nome,
                            especialidadeId: esp.id,
                            horario: {
                                "1": { ativo: true, inicio: "08:00", fim: "17:00" },
                                "2": { ativo: true, inicio: "08:00", fim: "17:00" },
                                "3": { ativo: true, inicio: "08:00", fim: "17:00" },
                                "4": { ativo: true, inicio: "08:00", fim: "17:00" },
                                "5": { ativo: true, inicio: "08:00", fim: "17:00" }
                            }
                        }
                    });
                }
            }
            return updatedUser;
        });
        await auditLog_service_1.auditLogService.log({
            actorId,
            clinicaId,
            accao: data.ativo === false ? 'DELETE' : 'UPDATE', // Spec says DEACTIVATE, but auditLog has DELETE
            recurso: 'utilizador',
            recursoId: id,
            antes: existing,
            depois: u,
            ip: ip ?? null
        });
        return toUtilizadorDTO(u);
    },
};
