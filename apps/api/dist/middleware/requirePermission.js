"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
const permissao_service_1 = require("../services/permissao.service");
const AppError_1 = require("../lib/AppError");
/**
 * Middleware para restringir acesso baseado em permissões granulares.
 */
function requirePermission(recurso, accao) {
    return async (req, _res, next) => {
        try {
            if (!req.user) {
                return next(new AppError_1.AppError('Utilizador não autenticado', 401, 'UNAUTHENTICATED'));
            }
            await permissao_service_1.permissaoService.requirePermission(req.user.id, recurso, accao);
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
