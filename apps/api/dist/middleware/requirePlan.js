"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePlan = requirePlan;
const AppError_1 = require("../lib/AppError");
const PLAN_ORDER = {
    BASICO: 0,
    PRO: 1,
    ENTERPRISE: 2
};
/**
 * Middleware to restrict access based on the clinic's subscription plan.
 * Also enforces read-only access for suspended accounts.
 */
function requirePlan(minimo) {
    return (req, _res, next) => {
        // req.clinica is populated by tenantMiddleware
        if (!req.clinica) {
            return next(new AppError_1.AppError('Contexto de clínica não encontrado', 403, 'MISSING_TENANT_CONTEXT'));
        }
        const planoClinica = req.clinica.plano;
        const estado = req.clinica.subscricaoEstado;
        // Suspensa: só leitura (GET) — bloquear tudo o resto
        if (estado === 'SUSPENSA' && req.method !== 'GET') {
            return next(new AppError_1.AppError('Subscrição suspensa. Renova o teu plano para continuar.', 402, 'SUBSCRIPTION_SUSPENDED'));
        }
        if (PLAN_ORDER[planoClinica] < PLAN_ORDER[minimo]) {
            return next(new AppError_1.AppError(`Esta funcionalidade requer plano ${minimo} ou superior.`, 402, 'PLAN_UPGRADE_REQUIRED', { planoActual: planoClinica, planoNecessario: minimo }));
        }
        next();
    };
}
