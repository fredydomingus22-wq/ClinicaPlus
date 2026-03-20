import { Router } from 'express';
import { requireRole } from '../middleware/requireRole';
import { superAdminService } from '../services/superadmin.service';
import { subscricaoService } from '../services/subscricao.service';
import { ClinicaListQuerySchema, Papel, PlanoSchema, ClinicaCreateSchema, Plano, EstadoSubscricao, RazaoMudancaPlano } from '@clinicaplus/types';
import { z } from 'zod';

const router = Router();

// Apply SUPER_ADMIN role protection to all routes in this router
router.use(requireRole([Papel.SUPER_ADMIN]));

/**
 * GET /superadmin/clinicas
 * List all clinics with pagination and filters
 */
router.get('/clinicas', async (req, res, next) => {
  try {
    const query = ClinicaListQuerySchema.parse(req.query);
    const result = await superAdminService.listClinicas(query);
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /superadmin/clinicas/:id
 * Get detail of any clinic
 */
router.get('/clinicas/:id', async (req, res, next) => {
  try {
    const result = await superAdminService.getClinica(req.params.id as string);
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /superadmin/clinicas/:id
 * Update clinic plan or active status
 */
router.patch('/clinicas/:id', async (req, res, next) => {
  try {
    const updateSchema = z.object({
      plano: PlanoSchema.optional(),
      ativo: z.boolean().optional(),
    });
    
    const body = updateSchema.parse(req.body) as { plano?: "BASICO" | "PRO" | "ENTERPRISE"; ativo?: boolean | undefined };
    const result = await superAdminService.updateClinica(req.params.id as string, body);
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /superadmin/stats
 * Global system statistics including subscription revenue
 */
router.get('/stats', async (req, res, next) => {
  try {
    const result = await superAdminService.getGlobalStats();
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /superadmin/clinicas
 * Provision a new tenant clinic
 */
router.post('/clinicas', async (req, res, next) => {
  try {
    const body = ClinicaCreateSchema.parse(req.body);
    const result = await superAdminService.provisionClinic(body, (req as unknown as { user: { id: string } }).user.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /superadmin/users
 * Global system users list
 */
router.get('/users', async (req, res, next) => {
  try {
    // Accept standard pagination and filters without strict schema to reuse frontend patterns easily
    const result = await superAdminService.listUsers(req.query as Record<string, string | undefined>);
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /superadmin/users/:id
 * Suspend or activate a global user
 */
router.patch('/users/:id', async (req, res, next) => {
  try {
    const schema = z.object({ ativo: z.boolean() });
    const { ativo } = schema.parse(req.body);
    const result = await superAdminService.updateUserStatus(req.params.id as string, ativo);
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /superadmin/logs
 * Global system logs
 */
router.get('/logs', async (req, res, next) => {
  try {
    const result = await superAdminService.listLogs(req.query as Record<string, string | undefined>);
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /superadmin/settings
 * Global system settings
 */
router.get('/settings', async (req, res, next) => {
  try {
    const result = await superAdminService.getGlobalSettings();
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /superadmin/settings
 * Update global system settings
 */
router.patch('/settings', async (req, res, next) => {
  try {
    const schema = z.object({
      modoManutencao: z.boolean().optional(),
      registoNovasClinicas: z.boolean().optional(),
      maxUploadSizeMb: z.number().optional(),
      mensagemSistema: z.string().nullable().optional()
    });
    const body = schema.parse(req.body);
    const result = await superAdminService.updateGlobalSettings(body);
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

// ─── Subscription Management ──────────────────────────────────────────

/**
 * POST /api/superadmin/clinicas/:id/subscricao/upgrade
 */
router.post('/clinicas/:id/subscricao/upgrade', async (req, res, next) => {
  try {
    const { plano, validaAte, valorKz, referenciaInterna, notas } = req.body;
    const sub = await subscricaoService.criarNovaSubscricao({
      clinicaId: req.params.id,
      plano: plano as Plano,
      estado: EstadoSubscricao.ACTIVA,
      ...(validaAte && { validaAte: new Date(validaAte) }),
      ...(valorKz && { valorKz }),
      ...(referenciaInterna && { referenciaInterna }),
      razao: RazaoMudancaPlano.UPGRADE_MANUAL,
      alteradoPor: req.user.id,
      ...(notas && { notas }),
    });
    res.json({ success: true, data: sub });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/superadmin/clinicas/:id/subscricao/downgrade
 */
router.post('/clinicas/:id/subscricao/downgrade', async (req, res, next) => {
  try {
    const { plano, notas } = req.body;
    const sub = await subscricaoService.criarNovaSubscricao({
      clinicaId: req.params.id,
      plano: plano as Plano,
      estado: EstadoSubscricao.ACTIVA,
      razao: RazaoMudancaPlano.DOWNGRADE_MANUAL,
      alteradoPor: req.user.id,
      ...(notas && { notas }),
    });
    res.json({ success: true, data: sub });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/superadmin/clinicas/:id/subscricao/reactivar
 */
router.post('/clinicas/:id/subscricao/reactivar', async (req, res, next) => {
  try {
    const clinica = await subscricaoService.getActual(req.params.id);
    const sub = await subscricaoService.criarNovaSubscricao({
      clinicaId: req.params.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plano: (clinica as any).plano,
      estado: EstadoSubscricao.ACTIVA,
      razao: RazaoMudancaPlano.REACTIVACAO,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alteradoPor: (req.user as any).id,
    });
    res.json({ success: true, data: sub });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/superadmin/clinicas/:id/subscricao/suspender
 */
router.post('/clinicas/:id/subscricao/suspender', async (req, res, next) => {
  try {
    await subscricaoService.suspender(req.params.id);
    res.json({ success: true, message: 'Subscrição suspensa com sucesso' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/superadmin/subscricoes/a-expirar
 */
router.get('/subscricoes/a-expirar', async (req, res, next) => {
  try {
    const clinicas = await subscricaoService.getExpiringSoon();
    res.json({ success: true, data: clinicas });
  } catch (err) {
    next(err);
  }
});

export default router;
