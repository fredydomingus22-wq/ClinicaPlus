"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireScope = exports.apiKeyAuth = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Middleware para autenticação via API Key (Headers: X-API-KEY).
 * Usado principalmente para integração com n8n.
 */
const apiKeyAuth = async (req, _res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return next(new AppError_1.AppError('API Key ausente (Header X-API-KEY)', 401, 'API_KEY_REQUIRED'));
    }
    try {
        if (!apiKey.startsWith('cp_live_') && !apiKey.startsWith('cp_internal_')) {
            return next(new AppError_1.AppError('Formato de API Key inválido (deve começar por cp_live_ ou cp_internal_)', 401, 'API_KEY_INVALID_FORMAT'));
        }
        const keyHash = crypto_1.default.createHash('sha256').update(apiKey).digest('hex');
        const keyRecord = await prisma_1.prisma.apiKey.findUnique({
            where: { keyHash },
            include: { clinica: true }
        });
        if (!keyRecord || !keyRecord.ativo) {
            return next(new AppError_1.AppError('API Key inválida ou desactivada', 401, 'INVALID_API_KEY'));
        }
        if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
            return next(new AppError_1.AppError('API Key expirada', 401, 'API_KEY_EXPIRED'));
        }
        // Inject clinica and scopes into request
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req.clinica = {
            id: keyRecord.clinicaId,
            slug: keyRecord.clinica.slug,
            plano: keyRecord.clinica.plano
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req.apiScopes = keyRecord.escopos;
        // Actualizar último uso (background)
        prisma_1.prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: { ultimoUso: new Date() }
        }).catch(() => { });
        next();
    }
    catch {
        next(new AppError_1.AppError('Falha na autenticação da API Key', 401, 'API_KEY_AUTH_FAILED'));
    }
};
exports.apiKeyAuth = apiKeyAuth;
/**
 * Middleware para verificar escopos da API Key.
 */
const requireScope = (scope) => {
    return (req, _res, next) => {
        const scopes = req.apiScopes || [];
        if (!scopes.includes(scope)) {
            return next(new AppError_1.AppError(`Escopo necessário ausente: ${scope}`, 403, 'INSUFFICIENT_SCOPE'));
        }
        next();
    };
};
exports.requireScope = requireScope;
