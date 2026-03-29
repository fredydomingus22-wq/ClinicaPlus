import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authService } from '../services/auth.service';
import { mfaService } from '../services/mfa.service';
import { auditLogService } from '../services/auditLog.service';
import jwt from 'jsonwebtoken';
import { LoginSchema, ForgotPasswordSchema, ResetPasswordSchema, SuperAdminLoginSchema, UtilizadorUpdateSchema } from '@clinicaplus/types';
import { config } from '../lib/config';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/authenticate';
import { AppError } from '../lib/AppError';

const router = Router();
const COOKIE_NAME = 'cp_refresh';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: (config.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
  // If TENANT_BASE_DOMAIN is set, we use it as the domain for the cookie
  // so it can be shared across subdomains (e.g., .clinicaplus.ao)
  ...(config.TENANT_BASE_DOMAIN ? { 
    domain: config.NODE_ENV === 'production' || config.TENANT_BASE_DOMAIN !== 'localhost'
      ? `.${config.TENANT_BASE_DOMAIN}` 
      : config.TENANT_BASE_DOMAIN 
  } : {}),
};

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const { email, password, clinicaSlug } = LoginSchema.parse(req.body);
    const result = await authService.login(email, password, clinicaSlug, req.ip);
    
    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
    
    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        utilizador: result.utilizador,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login-superadmin
router.post('/login-superadmin', authRateLimiter, async (req, res, next) => {
  try {
    const { email, password, mfaToken } = SuperAdminLoginSchema.parse(req.body);
    const result = await authService.loginSuperAdmin(email, password, req.ip, mfaToken);
    
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
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/registar-paciente
router.post('/registar-paciente', authRateLimiter, async (req, res, next) => {
  try {
    const { clinicaSlug, password, ...pacienteData } = req.body;
    
    // Quick validation
    if (!clinicaSlug || !password || !pacienteData.email || !pacienteData.nome) {
      throw new AppError('Dados incompletos para o registo.', 400, 'VALIDATION_ERROR');
    }

    const result = await authService.registerPaciente({ ...pacienteData, password, clinicaSlug }, clinicaSlug);
    
    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
    
    res.status(201).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        utilizador: result.utilizador,
      },
      message: 'Conta criada com sucesso!'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', authRateLimiter, async (req, res, next) => {
  try {
    const rawToken = req.cookies[COOKIE_NAME];
    if (!rawToken) {
      res.status(401).json({
        success: false,
        error: { message: 'Sessão não encontrada', code: 'UNAUTHENTICATED' },
      });
      return;
    }

    const result = await authService.refresh(rawToken);
    
    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
    
    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        utilizador: result.utilizador,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const rawToken = req.cookies[COOKIE_NAME];
    if (rawToken) {
      await authService.logout(rawToken);
    }
    
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authRateLimiter, async (req, res, next) => {
  try {
    const { email, clinicaSlug } = ForgotPasswordSchema.parse(req.body);
    let clinicaId = req.body.clinicaId;

    if (!clinicaId && clinicaSlug) {
      const clinica = await prisma.clinica.findUnique({ where: { slug: clinicaSlug } });
      if (clinica) {
        clinicaId = clinica.id;
      }
    }
    
    if (clinicaId) {
       await authService.forgotPassword(email, clinicaId);
    }
    
    res.json({ success: true, data: null, message: 'Se o email existir, as instruções foram enviadas.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', authRateLimiter, async (req, res, next) => {
  try {
    const { token, newPassword } = ResetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, newPassword);
    res.json({ success: true, data: null, message: 'Palavra-passe alterada com sucesso.' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/auth/change-password
router.patch('/change-password', authenticate, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      throw new AppError('Password atual e nova são obrigatórias', 400);
    }
    await authService.changePassword(req.user!.id, oldPassword, newPassword);
    res.json({ success: true, message: 'Palavra-passe alterada com sucesso' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/auth/me
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const data = UtilizadorUpdateSchema.parse(req.body);
    const result = await authService.updateProfile(req.user!.id, data);
    
    res.json({
      success: true,
      data: result,
      message: 'Perfil atualizado com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/mfa/setup
router.post('/mfa/setup', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new AppError('Não autorizado', 401);
    
    const token = authHeader.split(' ')[1];
    if (!token) throw new AppError('Token de setup ausente', 401);
    const secret: string = config.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as unknown as { sub: string, intent: string };
    
    if (decoded.intent !== 'mfa_setup') throw new AppError('Token de setup inválido', 401);
    
    const result = await mfaService.setup(decoded.sub);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/mfa/activate
router.post('/mfa/activate', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new AppError('Não autorizado', 401);
    
    const { token: mfaToken } = req.body;
    if (!mfaToken) throw new AppError('Token do autenticador ausente', 400);

    const setupToken = authHeader.split(' ')[1];
    if (!setupToken) throw new AppError('Token de setup ausente', 401);
    const decoded = jwt.verify(setupToken, config.JWT_SECRET as string) as unknown as { sub: string, intent: string };
    
    if (decoded.intent !== 'mfa_setup') throw new AppError('Token de setup inválido', 401);
    
    await mfaService.activate(decoded.sub, mfaToken);
    
    // Log success
    await auditLogService.log({
      actorId: decoded.sub,
      clinicaId: 'SYSTEM',
      accao: 'UPDATE',
      recurso: 'MFA',
      ip: req.ip || null,
      metadata: { status: 'success' }
    });

    res.json({ success: true, message: 'Autenticação de 2 fatores ativada.' });
  } catch (error) {
    next(error);
  }
});

export default router;
