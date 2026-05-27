"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeysService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../lib/prisma");
const auditLog_service_1 = require("./auditLog.service");
const planEnforcement_service_1 = require("./planEnforcement.service");
const subscricao_service_1 = require("./subscricao.service");
const permissao_service_1 = require("./permissao.service");
const types_1 = require("@clinicaplus/types");
exports.apiKeysService = {
    /**
     * Cria uma nova API Key para a clínica.
     * O token completo é devolvido APENAS UMA VEZ na criação.
     */
    async create(data, clinicaId, criadoPor) {
        // 0. Verificar permissão RBAC
        await permissao_service_1.permissaoService.requirePermission(criadoPor, 'apikey', 'manage');
        // 1. Verificar permissão no plano
        await planEnforcement_service_1.planEnforcementService.canUseFeature(clinicaId, 'apiKey');
        // 2. Verificar limite de keys do plano
        await subscricao_service_1.subscricaoService.verificarLimite(clinicaId, 'apikeys');
        // 3. Gerar token: cp_live_ + 64 chars hex (32 bytes)
        const secret = crypto_1.default.randomBytes(32).toString('hex');
        const token = `cp_live_${secret}`;
        const keyHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const prefixo = token.slice(0, 12); // "cp_live_...."
        // 4. Guardar no DB
        const apiKey = await prisma_1.prisma.apiKey.create({
            data: {
                clinicaId,
                nome: data.nome,
                keyHash,
                prefixo,
                escopos: data.escopos,
                criadoPor,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
            }
        });
        // 5. Audit Log
        await auditLog_service_1.auditLogService.log({
            actorId: criadoPor,
            clinicaId,
            accao: 'CREATE',
            recurso: 'apikey',
            recursoId: apiKey.id,
            depois: { nome: apiKey.nome, prefixo: apiKey.prefixo, escopos: apiKey.escopos }
        });
        return {
            id: apiKey.id,
            nome: apiKey.nome,
            prefixo: apiKey.prefixo,
            escopos: apiKey.escopos,
            ativo: apiKey.ativo,
            ultimoUso: apiKey.ultimoUso?.toISOString() || null,
            expiresAt: apiKey.expiresAt?.toISOString() || null,
            criadoEm: apiKey.criadoEm.toISOString(),
            token // DEVOLVIDO UMA VEZ
        };
    },
    /**
     * Revoga uma API Key (desativação lógica).
     */
    async revoke(id, clinicaId, revogadoPor) {
        const apiKey = await prisma_1.prisma.apiKey.findFirstOrThrow({
            where: { id, clinicaId }
        });
        await prisma_1.prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { ativo: false }
        });
        await auditLog_service_1.auditLogService.log({
            actorId: revogadoPor,
            clinicaId,
            accao: 'REVOKE',
            recurso: 'apikey',
            recursoId: apiKey.id
        });
    },
    /**
     * Lista as API Keys de uma clínica.
     */
    async list(clinicaId) {
        const keys = await prisma_1.prisma.apiKey.findMany({
            where: { clinicaId },
            orderBy: { criadoEm: 'desc' }
        });
        return keys.map(k => ({
            id: k.id,
            nome: k.nome,
            prefixo: k.prefixo,
            escopos: k.escopos,
            ativo: k.ativo,
            ultimoUso: k.ultimoUso?.toISOString() || null,
            expiresAt: k.expiresAt?.toISOString() || null,
            criadoEm: k.criadoEm.toISOString()
        }));
    },
    /**
     * Obtém ou cria uma API Key interna para uso do sistema (n8n, workers).
     */
    async getOrCreateInternal(clinicaId, nome) {
        // 1. Tentar encontrar uma ativa
        const existente = await prisma_1.prisma.apiKey.findFirst({
            where: { clinicaId, nome, ativo: true }
        });
        if (existente) {
            await prisma_1.prisma.apiKey.update({
                where: { id: existente.id },
                data: { ativo: false }
            });
        }
        // 2. Gerar novo token: cp_internal_{secret}
        const secret = crypto_1.default.randomBytes(32).toString('hex');
        const token = `cp_internal_${secret}`;
        const keyHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const prefix = token.slice(0, 16);
        await prisma_1.prisma.apiKey.create({
            data: {
                clinicaId,
                nome,
                keyHash,
                prefixo: prefix,
                escopos: [
                    types_1.EscopoApiKey.READ_AGENDAMENTOS,
                    types_1.EscopoApiKey.WRITE_AGENDAMENTOS,
                    types_1.EscopoApiKey.READ_PACIENTES,
                    types_1.EscopoApiKey.WRITE_PACIENTES
                ],
                criadoPor: 'sistema',
                expiresAt: null
            }
        });
        return { tokenPlain: token };
    }
};
