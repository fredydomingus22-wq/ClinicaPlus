"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const AppError_1 = require("../lib/AppError");
function requireRole(roles) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new AppError_1.AppError('Não autenticado', 401, 'UNAUTHENTICATED'));
        }
        if (!roles.includes(req.user.papel)) {
            return next(new AppError_1.AppError(`Acesso não permitido para o papel ${req.user.papel}`, 403, 'FORBIDDEN'));
        }
        next();
    };
}
