import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authService } from '../services/auth.service';
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
    const result = await authService.login(email, password, clinicaSlug);
    
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
    const { email, password } = SuperAdminLoginSchema.parse(req.body);
    const result = await authService.loginSuperAdmin(email, password);
    
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

export default router;
