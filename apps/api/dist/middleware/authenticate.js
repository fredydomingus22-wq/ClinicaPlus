"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../lib/config");
const AppError_1 = require("../lib/AppError");
const prisma_1 = require("../lib/prisma"); // Added for impersonation decoding
async function authenticate(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return next(new AppError_1.AppError('Não autenticado', 401, 'UNAUTHENTICATED'));
    }
    const token = header.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, config_1.config.JWT_SECRET);
        // Validar ativamente sessões de Impersonation na dB
        if (payload.isImpersonated && payload.impersonationId) {
            const session = await prisma_1.prisma.impersonationSession.findUnique({
                where: { id: payload.impersonationId }
            });
            if (!session || session.expiresAt < new Date()) {
                next(new AppError_1.AppError('Sessão de impersonation expirou ou não existe', 401, 'INVALID_TOKEN'));
                return;
            }
        }
        req.user = {
            id: payload.sub,
            clinicaId: payload.clinicaId,
            papel: payload.papel,
        };
        next();
    }
    catch {
        next(new AppError_1.AppError('Token inválido ou expirado', 401, 'INVALID_TOKEN'));
    }
}
