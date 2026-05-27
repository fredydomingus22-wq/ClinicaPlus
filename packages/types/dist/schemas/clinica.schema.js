"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicaListQuerySchema = exports.ClinicaUpdateSchema = exports.ConfiguracaoClinicaUpdateSchema = exports.ClinicaCreateSchema = exports.ContactoClinicaUpdateSchema = exports.ContactoClinicaCreateSchema = exports.ContactoClinicaSchema = void 0;
const zod_1 = require("zod");
exports.ContactoClinicaSchema = zod_1.z.object({
    tipo: zod_1.z.enum(['TELEFONE', 'WHATSAPP', 'EMAIL', 'OUTRO']),
    valor: zod_1.z.string().min(1, 'Valor é obrigatório'),
    descricao: zod_1.z.string().max(50).optional(),
    ordem: zod_1.z.number().int().default(0),
});
exports.ContactoClinicaCreateSchema = exports.ContactoClinicaSchema;
exports.ContactoClinicaUpdateSchema = exports.ContactoClinicaSchema.partial();
exports.ClinicaCreateSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    slug: zod_1.z.string().min(3, 'Slug deve ter pelo menos 3 caracteres'),
    email: zod_1.z.string().email('Email inválido'),
    adminNome: zod_1.z.string().min(3, 'Nome do administrador é obrigatório'),
    adminEmail: zod_1.z.string().email('Email do administrador inválido'),
    adminPassword: zod_1.z.string().min(8, 'Palavra-passe deve ter pelo menos 8 caracteres'),
    plano: zod_1.z.enum(['BASICO', 'PRO', 'ENTERPRISE']).default('BASICO'),
    telefone: zod_1.z.string().optional(),
    endereco: zod_1.z.string().optional(),
    cidade: zod_1.z.string().optional(),
    provincia: zod_1.z.string().optional(),
    logo: zod_1.z.string().optional().or(zod_1.z.literal('')),
});
exports.ConfiguracaoClinicaUpdateSchema = zod_1.z.object({
    lembrete24h: zod_1.z.boolean().optional(),
    lembrete2h: zod_1.z.boolean().optional(),
    agendamentoOnline: zod_1.z.boolean().optional(),
    preTriagem: zod_1.z.boolean().optional(),
    prontuarioCustom: zod_1.z.boolean().optional(),
    horasAntecedencia: zod_1.z.number().int().min(1).optional(),
    moedaSimbolo: zod_1.z.string().max(5).optional(),
    fusoHorario: zod_1.z.string().optional(),
    seguradoras: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.ClinicaUpdateSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').optional(),
    email: zod_1.z.string().email('Email inválido').optional(),
    telefone: zod_1.z.string().optional(),
    endereco: zod_1.z.string().optional(),
    cidade: zod_1.z.string().optional(),
    provincia: zod_1.z.string().optional(),
    logo: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    logotipoUrl: zod_1.z.string().optional().nullable().or(zod_1.z.literal('')),
    nif: zod_1.z.string().optional(),
    tipoEntidade: zod_1.z.enum(['SINGULAR', 'EMPRESA']).optional(),
    razaoSocial: zod_1.z.string().optional(),
    enderecoPostal: zod_1.z.string().optional(),
    regimeFiscal: zod_1.z.enum(['GERAL', 'SIMPLIFICADO', 'EXUSA']).optional(),
    serieDocFiscal: zod_1.z.string().optional(),
    agtPrivateKey: zod_1.z.string().optional(),
    agtPublicKey: zod_1.z.string().optional(),
    configuracao: exports.ConfiguracaoClinicaUpdateSchema.optional(),
});
exports.ClinicaListQuerySchema = zod_1.z.object({
    q: zod_1.z.string().optional(),
    plano: zod_1.z.string().optional(),
    ativo: zod_1.z.string().optional().transform(v => v === 'true').or(zod_1.z.boolean().optional()),
    page: zod_1.z.coerce.number().int().min(1).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
});
//# sourceMappingURL=clinica.schema.js.map