import { Router } from 'express';
import { requireRole } from '../middleware/requireRole';
import { superAdminService } from '../services/superadmin.service';
import { ClinicaListQuerySchema, Papel, PlanoSchema, ClinicaCreateSchema } from '@clinicaplus/types';
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

export default router;
