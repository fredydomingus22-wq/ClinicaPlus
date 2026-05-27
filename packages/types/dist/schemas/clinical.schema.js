"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExameCreateSchema = exports.AnamneseUpdateSchema = exports.AnamneseCreateSchema = exports.AnamneseSchema = exports.ExameSchema = exports.ProntuarioCreateSchema = exports.ProntuarioSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.ProntuarioSchema = zod_1.z.object({
    id: zod_1.z.string(),
    clinicaId: zod_1.z.string(),
    pacienteId: zod_1.z.string(),
    medicoId: zod_1.z.string(),
    agendamentoId: zod_1.z.string().optional().nullable(),
    notas: zod_1.z.string(),
    diagnostico: zod_1.z.string().optional().nullable(),
    criadoEm: zod_1.z.date().or(zod_1.z.string()),
    atualizadoEm: zod_1.z.date().or(zod_1.z.string()),
});
exports.ProntuarioCreateSchema = zod_1.z.object({
    pacienteId: zod_1.z.string(),
    medicoId: zod_1.z.string(),
    agendamentoId: zod_1.z.string().optional(),
    notas: zod_1.z.string().min(1, "As notas são obrigatórias"),
    diagnostico: zod_1.z.string().optional(),
});
exports.ExameSchema = zod_1.z.object({
    id: zod_1.z.string(),
    clinicaId: zod_1.z.string(),
    pacienteId: zod_1.z.string(),
    medicoId: zod_1.z.string(),
    agendamentoId: zod_1.z.string().optional().nullable(),
    nome: zod_1.z.string(),
    tipo: enums_1.TipoExameSchema,
    status: zod_1.z.string(),
    resultado: zod_1.z.string().optional().nullable(),
    dataPedido: zod_1.z.date().or(zod_1.z.string()),
    dataResultado: zod_1.z.date().or(zod_1.z.string()).optional().nullable(),
    criadoEm: zod_1.z.date().or(zod_1.z.string()),
    atualizadoEm: zod_1.z.date().or(zod_1.z.string()),
});
exports.AnamneseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    clinicaId: zod_1.z.string(),
    pacienteId: zod_1.z.string(),
    medicoId: zod_1.z.string(),
    agendamentoId: zod_1.z.string().optional().nullable(),
    especialidade: zod_1.z.string(),
    respostas: zod_1.z.record(zod_1.z.any()), // { [questionId]: { value: any, observation?: string } }
    criadoEm: zod_1.z.date().or(zod_1.z.string()),
    atualizadoEm: zod_1.z.date().or(zod_1.z.string()),
});
exports.AnamneseCreateSchema = zod_1.z.object({
    pacienteId: zod_1.z.string(),
    medicoId: zod_1.z.string(),
    agendamentoId: zod_1.z.string().optional(),
    especialidade: zod_1.z.string().default('ODONTOLOGIA'),
    respostas: zod_1.z.record(zod_1.z.any()),
});
exports.AnamneseUpdateSchema = zod_1.z.object({
    respostas: zod_1.z.record(zod_1.z.any()),
});
exports.ExameCreateSchema = zod_1.z.object({
    pacienteId: zod_1.z.string(),
    medicoId: zod_1.z.string(),
    agendamentoId: zod_1.z.string().optional(),
    nome: zod_1.z.string().min(1, "O nome do exame é obrigatório"),
    tipo: enums_1.TipoExameSchema,
    status: zod_1.z.string().default('PENDENTE'),
});
//# sourceMappingURL=clinical.schema.js.map