"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pacientesService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const patientNumber_service_1 = require("./patientNumber.service");
const permissao_service_1 = require("./permissao.service");
const auditLog_service_1 = require("./auditLog.service");
const subscricao_service_1 = require("./subscricao.service");
/**
 * Maps a Prisma Paciente to a PacienteDTO.
 * Always includes the alergias field, even if empty.
 * Never exposes passwordHash or other internal fields.
 */
function toPacienteDTO(p) {
    return {
        id: p.id,
        clinicaId: p.clinicaId,
        numeroPaciente: p.numeroPaciente,
        utilizadorId: p.utilizadorId,
        nome: p.nome,
        avatarUrl: p.avatarUrl,
        dataNascimento: p.dataNascimento.toISOString(),
        genero: p.genero,
        tipoSangue: p.tipoSangue,
        alergias: p.alergias, // Always included, even if empty []
        telefone: p.telefone,
        email: p.email,
        endereco: p.endereco,
        provincia: p.provincia,
        nif: p.nif,
        seguroSaude: p.seguroSaude,
        seguradora: p.seguradora,
        ativo: p.ativo,
        criadoEm: p.criadoEm.toISOString(),
        atualizadoEm: p.atualizadoEm.toISOString(),
    };
}
exports.pacientesService = {
    /**
     * Lists patients for a clinic with optional search and pagination.
     */
    async list(clinicaId, query) {
        const { q, provincia, ativo, page = 1, limit = 20 } = query;
        const where = {
            clinicaId,
            ...(ativo !== undefined && { ativo }),
            ...(provincia && { provincia }),
            ...(q && {
                OR: [
                    { nome: { contains: q, mode: 'insensitive' } },
                    { numeroPaciente: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                ],
            }),
        };
        const [items, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.paciente.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { nome: 'asc' },
                select: {
                    id: true,
                    clinicaId: true,
                    numeroPaciente: true,
                    utilizadorId: true,
                    nome: true,
                    avatarUrl: true,
                    dataNascimento: true,
                    genero: true,
                    tipoSangue: true,
                    telefone: true,
                    email: true,
                    endereco: true,
                    cidade: true,
                    provincia: true,
                    alergias: true,
                    nif: true,
                    seguroSaude: true,
                    seguradora: true,
                    origem: true,
                    ativo: true,
                    criadoEm: true,
                    atualizadoEm: true,
                    perfilWa: true,
                },
            }),
            prisma_1.prisma.paciente.count({ where }),
        ]);
        return { items: items.map(toPacienteDTO), total, page, limit };
    },
    /**
     * Returns a single patient by id. Enforces clinicaId ownership (cross-tenant safe).
     */
    async getOne(id, clinicaId) {
        const p = await prisma_1.prisma.paciente.findUnique({ where: { id } });
        if (!p || p.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Paciente não encontrado', 404, 'NOT_FOUND');
        }
        return toPacienteDTO(p);
    },
    /**
     * Returns the patient record linked to a specific user (for PACIENTE self-access).
     */
    async getOwn(utilizadorId, clinicaId) {
        const p = await prisma_1.prisma.paciente.findFirst({
            where: { utilizadorId, clinicaId },
        });
        if (!p) {
            throw new AppError_1.AppError('Perfil de paciente não encontrado', 404, 'NOT_FOUND');
        }
        return toPacienteDTO(p);
    },
    /**
     * Creates a new patient, automatically generating a sequential patient number.
     */
    async create(data, clinicaId) {
        await subscricao_service_1.subscricaoService.verificarLimite(clinicaId, 'pacientes');
        const numeroPaciente = await (0, patientNumber_service_1.generatePatientNumber)(clinicaId);
        const p = await prisma_1.prisma.paciente.create({
            data: {
                clinicaId,
                numeroPaciente,
                nome: data.nome,
                dataNascimento: new Date(data.dataNascimento),
                genero: data.genero,
                tipoSangue: data.tipoSangue ?? null,
                alergias: data.alergias ?? [],
                telefone: data.telefone ?? null,
                email: data.email || null,
                nif: data.nif || null,
                endereco: data.endereco ?? null,
                provincia: data.provincia ?? null,
                seguroSaude: data.seguroSaude ?? false,
                seguradora: data.seguradora ?? null,
                ativo: data.ativo ?? true,
            },
        });
        return toPacienteDTO(p);
    },
    /**
     * Updates a patient record. Validates ownership before updating.
     */
    async update(id, data, clinicaId) {
        // 1. Get existing to find utilizadorId
        const existing = await prisma_1.prisma.paciente.findUnique({ where: { id } });
        if (!existing || existing.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Paciente não encontrado', 404, 'NOT_FOUND');
        }
        // 2. Build explicit update payload to satisfy exactOptionalPropertyTypes
        const updateData = {};
        if (data.nome !== undefined)
            updateData.nome = data.nome;
        if (data.dataNascimento !== undefined)
            updateData.dataNascimento = new Date(data.dataNascimento);
        if (data.genero !== undefined)
            updateData.genero = data.genero;
        if (data.tipoSangue !== undefined)
            updateData.tipoSangue = data.tipoSangue ?? null;
        if (data.alergias !== undefined)
            updateData.alergias = data.alergias;
        if (data.telefone !== undefined)
            updateData.telefone = data.telefone ?? null;
        if (data.email !== undefined)
            updateData.email = data.email || null;
        if (data.nif !== undefined)
            updateData.nif = data.nif || null;
        if (data.endereco !== undefined)
            updateData.endereco = data.endereco ?? null;
        if (data.provincia !== undefined)
            updateData.provincia = data.provincia ?? null;
        if (data.seguroSaude !== undefined)
            updateData.seguroSaude = data.seguroSaude;
        if (data.seguradora !== undefined)
            updateData.seguradora = data.seguradora ?? null;
        if (data.ativo !== undefined)
            updateData.ativo = data.ativo;
        // 3. Execute in transaction to sync Utilizador if needed
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            const p = await tx.paciente.update({ where: { id }, data: updateData });
            // Sync Utilizador if linked
            if (p.utilizadorId && (data.nome !== undefined || data.email !== undefined)) {
                const userUpdate = {};
                if (data.nome !== undefined)
                    userUpdate.nome = data.nome;
                if (data.email !== undefined)
                    userUpdate.email = data.email || null;
                await tx.utilizador.update({
                    where: { id: p.utilizadorId },
                    data: userUpdate,
                });
            }
            return p;
        });
        return toPacienteDTO(updated);
    },
    /**
     * Remove um paciente. Requer permissão paciente:delete.
     */
    async delete(id, clinicaId, userId) {
        await permissao_service_1.permissaoService.requirePermission(userId, 'paciente', 'delete');
        const p = await prisma_1.prisma.paciente.findUnique({ where: { id } });
        if (!p || p.clinicaId !== clinicaId) {
            throw new AppError_1.AppError('Paciente não encontrado', 404, 'NOT_FOUND');
        }
        await prisma_1.prisma.paciente.delete({ where: { id } });
        await auditLog_service_1.auditLogService.log({
            actorId: userId,
            clinicaId,
            accao: 'DELETE',
            recurso: 'paciente',
            recursoId: id,
            antes: p,
        });
    },
};
