"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = tenantMiddleware;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
async function tenantMiddleware(req, _res, next) {
    // SUPER_ADMIN can bypass tenant checks or impersonate a clinic
    if (req.user?.papel === 'SUPER_ADMIN') {
        const impersonateId = req.headers['x-clinica-id'];
        if (impersonateId) {
            req.user.clinicaId = impersonateId;
        }
        else {
            // Provide a minimal fallback context to prevent req.clinica.id crashes
            req.clinica = { id: 'system-admin', nome: 'Administração Geral' };
            return next();
        }
    }
    if (!req.user?.clinicaId) {
        return next(new AppError_1.AppError('Contexto de clínica não encontrado', 403, 'MISSING_TENANT_CONTEXT'));
    }
    try {
        const clinica = await prisma_1.prisma.clinica.findUnique({
            where: { id: req.user.clinicaId },
            include: { configuracao: true },
        });
        if (!clinica) {
            return next(new AppError_1.AppError('Clínica não encontrada', 404, 'CLINICA_NOT_FOUND'));
        }
        if (!clinica.ativo) {
            return next(new AppError_1.AppError('Clínica inativa. Contacte o suporte.', 403, 'CLINICA_INACTIVE'));
        }
        req.clinica = clinica;
        next();
    }
    catch (err) {
        next(err);
    }
}
