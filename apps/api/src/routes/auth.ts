import { Router } from 'express';
import { authService } from '../services/auth.service';
import { LoginSchema, ForgotPasswordSchema, ResetPasswordSchema, SuperAdminLoginSchema } from '@clinicaplus/types';
import { config } from '../lib/config';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/authenticate';
import { AppError } from '../lib/AppError';

const router = Router();
const COOKIE_NAME = 'cp_refresh';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth',
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
    
    res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authRateLimiter, async (req, res, next) => {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);
    const clinicaId = req.body.clinicaId;
    
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

export default router;
