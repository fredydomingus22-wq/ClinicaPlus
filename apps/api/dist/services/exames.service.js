"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.examesService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const supabase_1 = require("../lib/supabase");
const config_1 = require("../lib/config");
const TRANSICOES_EXAME = {
    PENDENTE: ['AGENDADO', 'CANCELADO'],
    AGENDADO: ['REALIZADO', 'CANCELADO'],
    REALIZADO: ['LAUDADO'],
    LAUDADO: [],
    CANCELADO: [],
};
function assertExameTransicaoValida(actual, destino) {
    const validas = TRANSICOES_EXAME[actual];
    if (!validas.includes(destino)) {
        throw new AppError_1.AppError(`Não é possível passar de "${actual}" para "${destino}"`, 400);
    }
}
exports.examesService = {
    /**
     * Lists exams for a patient, handling legacy data mappings.
     */
    async listByPaciente(clinicaId, pacienteId) {
        const records = await prisma_1.prisma.exame.findMany({
            where: { clinicaId, pacienteId },
            include: {
                tipoCatalogo: true,
                medico: { select: { id: true, nome: true } }
            },
            orderBy: { criadoEm: 'desc' },
        });
        return records.map(r => ({
            ...r,
            nome: r.tipoCatalogo?.nome || r.nome,
            tipo: r.tipoCatalogo ? 'CATALOGO' : r.tipo,
            estado: r.estado,
            dataPedido: r.dataPedido.toISOString(),
            dataRealizacao: r.dataRealizacao?.toISOString() || null,
            dataResultado: r.dataResultado?.toISOString() || null,
            criadoEm: r.criadoEm.toISOString(),
            atualizadoEm: r.atualizadoEm.toISOString(),
        }));
    },
    /**
     * Lists all exams for a clinic with optional filters.
     */
    async listAll(clinicaId, filters) {
        const records = await prisma_1.prisma.exame.findMany({
            where: {
                clinicaId,
                ...(filters.estado ? { estado: filters.estado } : {}),
                ...(filters.q ? {
                    OR: [
                        { paciente: { nome: { contains: filters.q, mode: 'insensitive' } } },
                        { tipoCatalogo: { nome: { contains: filters.q, mode: 'insensitive' } } },
                        { nome: { contains: filters.q, mode: 'insensitive' } }
                    ]
                } : {})
            },
            include: {
                tipoCatalogo: true,
                paciente: { select: { id: true, nome: true, numeroPaciente: true } }
            },
            orderBy: { criadoEm: 'desc' },
        });
        return records.map(r => ({
            ...r,
            nome: r.tipoCatalogo?.nome || r.nome,
            dataPedido: r.dataPedido.toISOString(),
            criadoEm: r.criadoEm.toISOString(),
            atualizadoEm: r.atualizadoEm.toISOString(),
        }));
    },
    /**
     * Creates a new exam request using the new catalog or free text (legacy support).
     */
    async create(clinicaId, data) {
        const record = await prisma_1.prisma.exame.create({
            data: {
                clinicaId,
                pacienteId: data.pacienteId,
                medicoId: data.medicoId,
                agendamentoId: data.agendamentoId ?? null,
                tipoExameId: data.tipoExameId ?? null,
                nome: data.nome || 'Exame s/ nome', // Fallback para legados
                descricao: data.descricao,
                estado: 'PENDENTE',
            },
            include: { tipoCatalogo: true }
        });
        return {
            ...record,
            dataPedido: record.dataPedido.toISOString(),
            criadoEm: record.criadoEm.toISOString(),
            atualizadoEm: record.atualizadoEm.toISOString(),
        };
    },
    /**
     * Updates an exam (patch), enforcing state machine rules.
     */
    async update(clinicaId, id, data) {
        const current = await prisma_1.prisma.exame.findUnique({
            where: { id, clinicaId }
        });
        if (!current)
            throw new AppError_1.AppError('Exame não encontrado', 404);
        // Validação de transição de estado
        if (data.estado) {
            assertExameTransicaoValida(current.estado, data.estado);
        }
        const updated = await prisma_1.prisma.exame.update({
            where: { id, clinicaId },
            data: {
                ...data,
                // Se mudar para REALIZADO, seta a data se não enviada
                dataRealizacao: data.estado === 'REALIZADO' && !data.dataRealizacao ? new Date() : data.dataRealizacao,
            },
            include: { tipoCatalogo: true }
        });
        return {
            ...updated,
            dataPedido: updated.dataPedido.toISOString(),
            dataRealizacao: updated.dataRealizacao?.toISOString() || null,
            dataResultado: updated.dataResultado?.toISOString() || null,
            criadoEm: updated.criadoEm.toISOString(),
            atualizadoEm: updated.atualizadoEm.toISOString(),
        };
    },
    /**
     * Gera uma Signed URL para upload seguro diretamente para o Supabase.
     */
    async getLaudoUploadUrl(clinicaId, id, fileName) {
        const exame = await prisma_1.prisma.exame.findUnique({ where: { id, clinicaId } });
        if (!exame)
            throw new AppError_1.AppError('Exame não encontrado', 404);
        const ext = fileName.split('.').pop() || 'pdf';
        const path = `${clinicaId}/exames/${id}/laudo_${Date.now()}.${ext}`;
        const { data: uploadData, error } = await supabase_1.supabase.storage
            .from(config_1.config.SUPABASE_LAUDOS_BUCKET)
            .createSignedUploadUrl(path);
        if (error || !uploadData) {
            throw new AppError_1.AppError('Erro ao gerar URL de upload', 500);
        }
        return { uploadUrl: uploadData.signedUrl, path };
    },
    /**
     * Confirma o upload do laudo e avança o estado para LAUDADO.
     */
    async confirmLaudo(clinicaId, id, path) {
        // Verificar se o arquivo realmente existe no Supabase
        const { data, error } = await supabase_1.supabase.storage
            .from(config_1.config.SUPABASE_LAUDOS_BUCKET)
            .list(path.substring(0, path.lastIndexOf('/')), {
            search: path.split('/').pop() || ''
        });
        if (error || !data || data.length === 0) {
            throw new AppError_1.AppError('Arquivo não encontrado no storage', 400);
        }
        const { data: publicUrlData } = supabase_1.supabase.storage
            .from(config_1.config.SUPABASE_LAUDOS_BUCKET)
            .getPublicUrl(path);
        return this.update(clinicaId, id, {
            laudoUrl: publicUrlData.publicUrl,
            estado: 'LAUDADO',
            dataResultado: new Date()
        });
    }
};
