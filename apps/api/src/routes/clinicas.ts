import { Router } from 'express';
import { ClinicaCreateSchema, ClinicaUpdateSchema } from '@clinicaplus/types';
import { clinicasService } from '../services/clinicas.service';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { Papel } from '@clinicaplus/types';

const router = Router();
const COOKIE_NAME = 'cp_refresh';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
};

/**
 * POST /clinicas/registar
 * Public — registers a new clinic and returns accessToken + ClinicaDTO.
 */
router.post('/registar', async (req, res, next) => {
  try {
    const body = ClinicaCreateSchema.parse(req.body);
    const result = await clinicasService.registar(body);
    // Set refresh cookie so ADMIN is immediately logged in
    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
    return res.status(201).json({
      success: true,
      data: { clinica: result.clinica, accessToken: result.accessToken },
    });
  } catch (err) { return next(err); }
});

/**
 * GET /clinicas/verificar-slug/:slug
 * Public — checks if a slug is available.
 */
router.get('/verificar-slug/:slug', async (req, res, next) => {
  try {
    const result = await clinicasService.verificarSlug(req.params.slug);
    return res.json({ success: true, data: result });
  } catch (err) { return next(err); }
});

/**
 * GET /clinicas/me
 * Auth: ADMIN — returns the current clinic details.
 */
router.get('/me',
  authenticate,
  requireRole([Papel.ADMIN, Papel.MEDICO, Papel.RECEPCIONISTA, Papel.PACIENTE]),
  async (req, res, next) => {
    try {
      const clinica = await clinicasService.getMe(req.user.clinicaId);
      return res.json({ success: true, data: clinica });
    } catch (err) { return next(err); }
  }
);

/**
 * PATCH /clinicas/me
 * Auth: ADMIN — updates editable clinic fields (slug and plano not allowed).
 */
router.patch('/me',
  authenticate,
  requireRole([Papel.ADMIN]),
  async (req, res, next) => {
    try {
      const body = ClinicaUpdateSchema.parse(req.body);
      const clinica = await clinicasService.update(req.user.clinicaId, body);
      return res.json({ success: true, data: clinica });
    } catch (err) { return next(err); }
  }
);

/**
 * PUT /clinicas/me/contactos
 * Auth: ADMIN — updates clinic contacts list.
 */
router.put('/me/contactos',
  authenticate,
  requireRole([Papel.ADMIN]),
  async (req, res, next) => {
    try {
      if (!Array.isArray(req.body.contactos)) {
        throw new Error('Contactos deve ser um array');
      }
      const clinica = await clinicasService.updateContactos(req.user.clinicaId, req.body.contactos);
      return res.json({ success: true, data: clinica });
    } catch (err) { return next(err); }
  }
);

export default router;
