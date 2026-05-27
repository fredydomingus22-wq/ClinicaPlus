"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriarTipoTratamentoSchema = exports.CriarTipoExameClinicaSchema = exports.PlanoTratamentoSchema = exports.TipoTratamentoSchema = exports.TipoExameClinicaSchema = exports.AtualizarSessaoSchema = exports.EstadoSessaoSchema = exports.AtualizarPlanoSchema = exports.CriarPlanoSchema = exports.EstadoPlanoSchema = exports.AtualizarExameSchema = exports.CriarExameSchema = exports.EstadoExameSchema = void 0;
const zod_1 = require("zod");
// ─── EXAME
exports.EstadoExameSchema = zod_1.z.enum(['PENDENTE', 'AGENDADO', 'REALIZADO', 'LAUDADO', 'CANCELADO']);
exports.CriarExameSchema = zod_1.z.object({
    pacienteId: zod_1.z.string().cuid(),
    medicoId: zod_1.z.string().cuid(),
    agendamentoId: zod_1.z.string().cuid().optional(),
    tipoExameId: zod_1.z.string().cuid().optional(), // Usa catálogo novo, mas ainda é opcional perante legados.
    descricao: zod_1.z.string().max(500).optional(),
});
exports.AtualizarExameSchema = zod_1.z.object({
    estado: exports.EstadoExameSchema.optional(),
    dataRealizacao: zod_1.z.coerce.date().optional(),
    laudoNota: zod_1.z.string().max(2000).optional(),
});
// ─── PLANO
exports.EstadoPlanoSchema = zod_1.z.enum(['ACTIVO', 'SUSPENSO', 'CONCLUIDO', 'CANCELADO']);
exports.CriarPlanoSchema = zod_1.z.object({
    pacienteId: zod_1.z.string().cuid(),
    agendamentoOrigemId: zod_1.z.string().cuid().optional(),
    medicoId: zod_1.z.string().cuid(),
    responsavelId: zod_1.z.string().cuid().optional(),
    tipoId: zod_1.z.string().cuid(), // OBRIGATÓRIO (Link Catálogo TipoTratamento)
    descricao: zod_1.z.string().max(500).optional(),
    totalSessoes: zod_1.z.number().int().min(1).max(500),
    frequenciaSemana: zod_1.z.number().int().min(1).max(7),
    dataInicio: zod_1.z.coerce.date(),
    duracaoSessaoMin: zod_1.z.number().int().min(15).max(480),
    observacoes: zod_1.z.string().max(1000).optional(),
});
exports.AtualizarPlanoSchema = zod_1.z.object({
    estado: exports.EstadoPlanoSchema.optional(),
    observacoes: zod_1.z.string().max(1000).optional(),
    dataFimReal: zod_1.z.coerce.date().optional(),
});
// ─── SESSOES
exports.EstadoSessaoSchema = zod_1.z.enum(['AGENDADO', 'REALIZADO', 'FALTOU', 'CANCELADO']);
exports.AtualizarSessaoSchema = zod_1.z.object({
    estado: exports.EstadoSessaoSchema.optional(),
    notas: zod_1.z.string().max(2000).optional(),
    dataHora: zod_1.z.coerce.date().optional()
});
// ─── CATALOGOS (Leitura base)
exports.TipoExameClinicaSchema = zod_1.z.object({
    id: zod_1.z.string().cuid(),
    clinicaId: zod_1.z.string(),
    nome: zod_1.z.string(),
    descricao: zod_1.z.string().nullable().optional(),
    preco: zod_1.z.number().int(),
    ativo: zod_1.z.boolean()
});
exports.TipoTratamentoSchema = zod_1.z.object({
    id: zod_1.z.string().cuid(),
    clinicaId: zod_1.z.string(),
    nome: zod_1.z.string(),
    descricao: zod_1.z.string().nullable().optional(),
    duracaoMin: zod_1.z.number().nullable().optional(),
    preco: zod_1.z.number().int(),
    ativo: zod_1.z.boolean()
});
exports.PlanoTratamentoSchema = zod_1.z.object({
    id: zod_1.z.string().cuid(),
    clinicaId: zod_1.z.string(),
    pacienteId: zod_1.z.string(),
    medicoId: zod_1.z.string(),
    tipoId: zod_1.z.string(),
    totalSessoes: zod_1.z.number().int(),
    frequenciaSemana: zod_1.z.number().int(),
    sessoesRealizadas: zod_1.z.number().int().optional().default(0),
    dataInicio: zod_1.z.string(),
    dataFimPrevista: zod_1.z.string(),
    dataFimReal: zod_1.z.string().nullable().optional(),
    estado: zod_1.z.string(),
    descricao: zod_1.z.string().nullable().optional(),
    observacoes: zod_1.z.string().nullable().optional(),
    agendamentoOrigemId: zod_1.z.string().nullable().optional(),
    responsavelId: zod_1.z.string().nullable().optional(),
    criadoEm: zod_1.z.string(),
    atualizadoEm: zod_1.z.string(),
    tipoTratamento: exports.TipoTratamentoSchema.optional(),
    paciente: zod_1.z.any().optional(),
    _count: zod_1.z.object({ sessoes: zod_1.z.number() }).optional(),
});
exports.CriarTipoExameClinicaSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1).max(100),
    descricao: zod_1.z.string().max(500).optional(),
    preco: zod_1.z.number().int().min(0).optional().default(0),
    ativo: zod_1.z.boolean().optional().default(true),
});
exports.CriarTipoTratamentoSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1).max(100),
    descricao: zod_1.z.string().max(500).optional(),
    duracaoMin: zod_1.z.number().int().min(1).optional(),
    preco: zod_1.z.number().int().min(0).optional().default(0),
    ativo: zod_1.z.boolean().optional().default(true),
});
//# sourceMappingURL=tratamentos.js.map