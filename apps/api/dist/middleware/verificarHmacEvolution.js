"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificarHmacEvolution = void 0;
const crypto_1 = __importDefault(require("crypto"));
const AppError_1 = require("../lib/AppError");
const config_1 = require("../lib/config");
/**
 * Middleware para verificar a assinatura HMAC da Evolution API.
 */
const verificarHmacEvolution = async (req, _res, next) => {
    const secret = process.env.EVOLUTION_WEBHOOK_SECRET ?? config_1.config.EVOLUTION_WEBHOOK_SECRET;
    if (process.env.DISABLE_WEBHOOK_SIGNATURE_CHECK === 'true') {
        return next();
    }
    if (!secret) {
        if (!secret && config_1.config.NODE_ENV === 'production') {
            return next(new AppError_1.AppError('Configuração de segurança em falta (EVOLUTION_WEBHOOK_SECRET)', 500));
        }
        return next();
    }
    const assinatura = req.headers['x-evolution-signature'];
    if (!assinatura) {
        return next(new AppError_1.AppError('Assinatura ausente', 401, 'WEBHOOK_NO_SIGNATURE'));
    }
    try {
        const hmac = crypto_1.default.createHmac('sha256', secret)
            .update(JSON.stringify(req.body))
            .digest('hex');
        // Protecção timingSafeEqual para evitar ataques de tempo
        const signatureBuffer = Buffer.from(assinatura, 'hex');
        const hmacBuffer = Buffer.from(hmac, 'hex');
        if (signatureBuffer.length !== hmacBuffer.length || !crypto_1.default.timingSafeEqual(signatureBuffer, hmacBuffer)) {
            return next(new AppError_1.AppError('Assinatura HMAC inválida', 401, 'INVALID_SIGNATURE'));
        }
        next();
    }
    catch {
        next(new AppError_1.AppError('Falha na validação da assinatura', 401, 'VALIDATION_FAILED'));
    }
};
exports.verificarHmacEvolution = verificarHmacEvolution;
