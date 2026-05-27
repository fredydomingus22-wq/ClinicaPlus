"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminLoginSchema = exports.ResetPasswordSchema = exports.ForgotPasswordSchema = exports.LoginSchema = void 0;
const zod_1 = require("zod");
exports.LoginSchema = zod_1.z.object({
    clinicaSlug: zod_1.z
        .string()
        .min(1, 'Introduz o nome da tua clínica')
        .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
    email: zod_1.z
        .string()
        .min(1, 'Email obrigatório')
        .email('Introduz um email válido'),
    password: zod_1.z
        .string()
        .min(1, 'Palavra-passe obrigatória'),
});
exports.ForgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email().trim().toLowerCase(),
    clinicaSlug: zod_1.z.string().optional(),
});
exports.ResetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8).max(100),
});
exports.SuperAdminLoginSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .min(1, 'Email obrigatório')
        .email('Introduz um email válido')
        .trim()
        .toLowerCase(),
    password: zod_1.z
        .string()
        .min(1, 'Palavra-passe obrigatória'),
    mfaToken: zod_1.z.string().optional(),
});
//# sourceMappingURL=auth.schema.js.map