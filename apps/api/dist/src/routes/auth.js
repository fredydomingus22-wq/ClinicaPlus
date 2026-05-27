"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_service_1 = require("../services/auth.service");
const mfa_service_1 = require("../services/mfa.service");
const auditLog_service_1 = require("../services/auditLog.service");
const clinicas_service_1 = require("../services/clinicas.service");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const types_1 = require("@clinicaplus/types");
const config_1 = require("../lib/config");
const rateLimiter_1 = require("../middleware/rateLimiter");
const authenticate_1 = require("../middleware/authenticate");
const AppError_1 = require("../lib/AppError");
const router = (0, express_1.Router)();
const COOKIE_NAME = 'cp_refresh';
const COOKIE_OPTS = {
    httpOnly: true,
    secure: config_1.config.NODE_ENV === 'production',
    sameSite: (config_1.config.NODE_ENV === 'production' ? 'none' : 'lax'),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
    // If TENANT_BASE_DOMAIN is set, we use it as the domain for the cookie
    // so it can be shared across subdomains (e.g., .clinicaplus.ao)
    ...(config_1.config.TENANT_BASE_DOMAIN ? {
        domain: config_1.config.NODE_ENV === 'production' || config_1.config.TENANT_BASE_DOMAIN !== 'localhost'
            ? `.${config_1.config.TENANT_BASE_DOMAIN}`
            : config_1.config.TENANT_BASE_DOMAIN
    } : {}),
};
// POST /api/auth/login
router.post('/login', rateLimiter_1.authRateLimiter, async (req, res, next) => {
    try {
        const { email, password, clinicaSlug } = types_1.LoginSchema.parse(req.body);
        const result = await auth_service_1.authService.login(email, password, clinicaSlug, req.ip);
        res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
        res.json({
            success: true,
            data: {
                accessToken: result.accessToken,
                utilizador: result.utilizador,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/auth/login-superadmin
router.post('/login-superadmin', rateLimiter_1.authRateLimiter, async (req, res, next) => {
    try {
        const { email, password, mfaToken } = types_1.SuperAdminLoginSchema.parse(req.body);
        const result = await auth_service_1.authService.loginSuperAdmin(email, password, req.ip, mfaToken);
        // If MFA setup is required
        if (result.requiresMfaSetup) {
            res.json({
                success: true,
                requiresMfaSetup: true,
                setupToken: result.setupToken
            });
            return;
        }
        // If MFA is required but token was not provided
        if (result.requiresMfa) {
            res.json({
                success: true,
                requiresMfa: true
            });
            return;
        }
        // Normal successful login
        res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
        res.json({
            success: true,
            data: {
                accessToken: result.accessToken,
                utilizador: result.utilizador,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/auth/registar-paciente
router.post('/registar-paciente', rateLimiter_1.authRateLimiter, async (req, res, next) => {
    try {
        const { clinicaSlug, password, ...pacienteData } = req.body;
        // Quick validation
        if (!clinicaSlug || !password || !pacienteData.email || !pacienteData.nome) {
            throw new AppError_1.AppError('Dados incompletos para o registo.', 400, 'VALIDATION_ERROR');
        }
        const result = await auth_service_1.authService.registerPaciente({ ...pacienteData, password, clinicaSlug }, clinicaSlug);
        res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
        res.status(201).json({
            success: true,
            data: {
                accessToken: result.accessToken,
                utilizador: result.utilizador,
            },
            message: 'Conta criada com sucesso!'
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/auth/registar-clinica
// Backward-compatible alias used by older login/register pages.
router.post('/registar-clinica', rateLimiter_1.authRateLimiter, async (req, res, next) => {
    try {
        const payload = req.body;
        const mapped = {
            nome: String(payload['nome'] ?? payload['clinicaNome'] ?? ''),
            slug: String(payload['slug'] ?? payload['clinicaSlug'] ?? ''),
            email: String(payload['email'] ?? ''),
            adminNome: String(payload['adminNome'] ?? ''),
            adminEmail: String(payload['adminEmail'] ?? payload['email'] ?? ''),
            adminPassword: String(payload['adminPassword'] ?? payload['password'] ?? ''),
            telefone: payload['telefone'] ? String(payload['telefone']) : undefined,
            endereco: payload['endereco'] ? String(payload['endereco']) : undefined,
            cidade: payload['cidade'] ? String(payload['cidade']) : undefined,
            provincia: payload['provincia'] ? String(payload['provincia']) : undefined,
            logo: payload['logo'] ? String(payload['logo']) : undefined,
        };
        const result = await clinicas_service_1.clinicasService.registar(mapped);
        res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
        res.status(201).json({
            success: true,
            data: { clinica: result.clinica, accessToken: result.accessToken },
            message: 'Clínica registada com sucesso!',
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/auth/refresh
router.post('/refresh', rateLimiter_1.authRateLimiter, async (req, res, next) => {
    try {
        const rawToken = req.cookies[COOKIE_NAME];
        if (!rawToken) {
            res.status(401).json({
                success: false,
                error: { message: 'Sessão não encontrada', code: 'UNAUTHENTICATED' },
            });
            return;
        }
        const result = await auth_service_1.authService.refresh(rawToken);
        res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
        res.json({
            success: true,
            data: {
                accessToken: result.accessToken,
                utilizador: result.utilizador,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
    try {
        const rawToken = req.cookies[COOKIE_NAME];
        if (rawToken) {
            await auth_service_1.authService.logout(rawToken);
        }
        res.clearCookie(COOKIE_NAME, { path: '/' });
        res.json({ success: true, data: null });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/auth/forgot-password
router.post('/forgot-password', rateLimiter_1.authRateLimiter, async (req, res, next) => {
    try {
        const { email, clinicaSlug } = types_1.ForgotPasswordSchema.parse(req.body);
        let clinicaId = req.body.clinicaId;
        if (!clinicaId && clinicaSlug) {
            const clinica = await prisma_1.prisma.clinica.findUnique({ where: { slug: clinicaSlug } });
            if (clinica) {
                clinicaId = clinica.id;
            }
        }
        if (clinicaId) {
            await auth_service_1.authService.forgotPassword(email, clinicaId);
        }
        res.json({ success: true, data: null, message: 'Se o email existir, as instruções foram enviadas.' });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/auth/reset-password
router.post('/reset-password', rateLimiter_1.authRateLimiter, async (req, res, next) => {
    try {
        const { token, newPassword } = types_1.ResetPasswordSchema.parse(req.body);
        await auth_service_1.authService.resetPassword(token, newPassword);
        res.json({ success: true, data: null, message: 'Palavra-passe alterada com sucesso.' });
    }
    catch (error) {
        next(error);
    }
});
// PATCH /api/auth/change-password
router.patch('/change-password', authenticate_1.authenticate, async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            throw new AppError_1.AppError('Password atual e nova são obrigatórias', 400);
        }
        await auth_service_1.authService.changePassword(req.user.id, oldPassword, newPassword);
        res.json({ success: true, message: 'Palavra-passe alterada com sucesso' });
    }
    catch (error) {
        next(error);
    }
});
// PATCH /api/auth/me
router.patch('/me', authenticate_1.authenticate, async (req, res, next) => {
    try {
        const data = types_1.UtilizadorUpdateSchema.parse(req.body);
        const result = await auth_service_1.authService.updateProfile(req.user.id, data);
        res.json({
            success: true,
            data: result,
            message: 'Perfil atualizado com sucesso'
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/auth/mfa/setup
router.post('/mfa/setup', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer '))
            throw new AppError_1.AppError('Não autorizado', 401);
        const token = authHeader.split(' ')[1];
        if (!token)
            throw new AppError_1.AppError('Token de setup ausente', 401);
        const secret = config_1.config.JWT_SECRET;
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        if (decoded.intent !== 'mfa_setup')
            throw new AppError_1.AppError('Token de setup inválido', 401);
        const result = await mfa_service_1.mfaService.setup(decoded.sub);
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/auth/mfa/activate
router.post('/mfa/activate', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer '))
            throw new AppError_1.AppError('Não autorizado', 401);
        const { token: mfaToken } = req.body;
        if (!mfaToken)
            throw new AppError_1.AppError('Token do autenticador ausente', 400);
        const setupToken = authHeader.split(' ')[1];
        if (!setupToken)
            throw new AppError_1.AppError('Token de setup ausente', 401);
        const decoded = jsonwebtoken_1.default.verify(setupToken, config_1.config.JWT_SECRET);
        if (decoded.intent !== 'mfa_setup')
            throw new AppError_1.AppError('Token de setup inválido', 401);
        await mfa_service_1.mfaService.activate(decoded.sub, mfaToken);
        // Log success
        await auditLog_service_1.auditLogService.log({
            actorId: decoded.sub,
            clinicaId: 'SYSTEM',
            accao: 'UPDATE',
            recurso: 'MFA',
            ip: req.ip || null,
            metadata: { status: 'success' }
        });
        res.json({ success: true, message: 'Autenticação de 2 fatores ativada.' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
