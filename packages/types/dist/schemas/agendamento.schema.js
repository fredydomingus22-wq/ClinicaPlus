"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgendamentoListQuerySchema = exports.AgendamentoConsultaSchema = exports.AgendamentoTriagemSchema = exports.AgendamentoUpdateEstadoSchema = exports.AgendamentoCreateSchema = exports.TriagemSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.TriagemSchema = zod_1.z.object({
    pa: zod_1.z.string().regex(/^\d{2,3}\/\d{2,3}$/).optional(),
    temperatura: zod_1.z.number().min(30).max(45).optional(),
    peso: zod_1.z.number().min(0.5).max(500).optional(),
    altura: zod_1.z.number().min(30).max(250).optional(),
    imc: zod_1.z.number().optional(),
    frequenciaCardiaca: zod_1.z.number().int().min(20).max(300).optional(),
    sintomas: zod_1.z.array(zod_1.z.string().trim()).optional(),
    urgencia: zod_1.z.enum(['NORMAL', 'URGENTE', 'MUITO_URGENTE']).default('NORMAL'),
});
exports.AgendamentoCreateSchema = zod_1.z.object({
    pacienteId: zod_1.z.string(),
    medicoId: zod_1.z.string(),
    dataHora: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Data e hora inválidas",
    }),
    duracao: zod_1.z.number().int().min(10).max(120).optional(),
    tipo: enums_1.TipoAgendamentoSchema.default(enums_1.TipoAgendamento.CONSULTA),
    estado: enums_1.EstadoAgendamentoSchema.optional(),
    motivoConsulta: zod_1.z.string().max(500).trim().optional(),
    observacoes: zod_1.z.string().max(1000).trim().optional(),
});
exports.AgendamentoUpdateEstadoSchema = zod_1.z.object({
    estado: enums_1.EstadoAgendamentoSchema,
    motivo: zod_1.z.string().max(500).trim().optional(),
});
exports.AgendamentoTriagemSchema = exports.TriagemSchema.extend({
    urgencia: zod_1.z.enum(['NORMAL', 'URGENTE', 'MUITO_URGENTE'])
});
exports.AgendamentoConsultaSchema = zod_1.z.object({
    notasConsulta: zod_1.z.string().max(5000).trim().optional(),
    diagnostico: zod_1.z.string().max(1000).trim().optional(),
    finalizar: zod_1.z.boolean().optional(),
});
exports.AgendamentoListQuerySchema = zod_1.z.object({
    medicoId: zod_1.z.string().optional(),
    pacienteId: zod_1.z.string().optional(),
    estado: enums_1.EstadoAgendamentoSchema.optional(),
    tipo: enums_1.TipoAgendamentoSchema.optional(),
    dataInicio: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida" }).optional(),
    dataFim: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida" }).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=agendamento.schema.js.map