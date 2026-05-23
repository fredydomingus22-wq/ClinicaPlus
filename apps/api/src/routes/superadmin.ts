import { Router } from 'express';
import { requireRole } from '../middleware/requireRole';
import { superAdminService } from '../services/superadmin.service';
import { subscricaoService } from '../services/subscricao.service';
import { 
  ClinicaListQuerySchema, 
  Papel, 
  PlanoSchema, 
  ClinicaCreateSchema, 
  Plano, 
  EstadoSubscricao, 
  RazaoMudancaPlano 
} from '@clinicaplus/types';
import { z } from 'zod';
import { auditLogService } from '../services/auditLog.service';

const router = Router();

// Apply SUPER_ADMIN role protection to all routes in this router
router.use(requireRole([Papel.SUPER_ADMIN]));

/**
 * GET /api/superadmin/stats
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const result = await superAdminService.getGlobalStats();
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/superadmin/dashboard
 */
router.get('/dashboard', async (_req, res, next) => {
  try {
    const result = await superAdminService.getDashboardKPIs();
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/superadmin/clinicas
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
 * GET /api/superadmin/clinicas/:id
 */
router.get('/clinicas/:id', async (req, res, next) => {
  try {
    const result = await superAdminService.getClinica(req.params.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/superadmin/clinicas/:id
 */
router.patch('/clinicas/:id', async (req, res, next) => {
  try {
    const updateSchema = z.object({
      plano: PlanoSchema.optional(),
      ativo: z.boolean().optional(),
    });
    const body = updateSchema.parse(req.body);
    const data: { plano?: string; ativo?: boolean } = {};
    if (body.plano) data.plano = body.plano as string;
    if (body.ativo !== undefined) data.ativo = body.ativo;

    const result = await superAdminService.updateClinica(req.params.id, data);
    
    // Log action
    await auditLogService.log({
      actorId: req.user!.id,
      clinicaId: req.params.id,
      accao: 'UPDATE',
      recurso: 'CLINICA',
      metadata: body,
      ip: req.ip || null
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/superadmin/clinicas
 */
router.post('/clinicas', async (req, res, next) => {
  try {
    const body = ClinicaCreateSchema.parse(req.body);
    const userId = req.user!.id;
    const result = await superAdminService.provisionClinic(body, userId);
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/superadmin/users
 */
router.get('/users', async (req, res, next) => {
  try {
    const result = await superAdminService.listUsers(req.query as Record<string, string | undefined>);
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/superadmin/users/:id
 */
router.patch('/users/:id', async (req, res, next) => {
  try {
    const schema = z.object({ ativo: z.boolean() });
    const { ativo } = schema.parse(req.body);
    const result = await superAdminService.updateUserStatus(req.params.id, ativo);
    
    // Log action
    await auditLogService.log({
      actorId: req.user!.id,
      clinicaId: 'SYSTEM',
      accao: 'UPDATE',
      recurso: 'USER',
      metadata: { status: ativo, userId: req.params.id },
      ip: req.ip || null
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/superadmin/logs
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
 * GET /api/superadmin/settings
 */
router.get('/settings', async (_req, res, next) => {
  try {
    const result = await superAdminService.getGlobalSettings();
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/superadmin/settings
 */
router.patch('/settings', async (req, res, next) => {
  try {
    const schema = z.object({
      modoManutencao: z.boolean().optional(),
      registoNovasClinicas: z.boolean().optional(),
      maxUploadSizeMb: z.number().optional(),
      mensagemSistema: z.string().nullable().optional()
    });
    
    // Filtrar undefined para satisfazer exactOptionalPropertyTypes
    const rawBody = schema.parse(req.body);
    const body: {
      modoManutencao?: boolean;
      registoNovasClinicas?: boolean;
      maxUploadSizeMb?: number;
      mensagemSistema?: string | null;
    } = {};
    
    if (rawBody.modoManutencao !== undefined) body.modoManutencao = rawBody.modoManutencao;
    if (rawBody.registoNovasClinicas !== undefined) body.registoNovasClinicas = rawBody.registoNovasClinicas;
    if (rawBody.maxUploadSizeMb !== undefined) body.maxUploadSizeMb = rawBody.maxUploadSizeMb;
    if (rawBody.mensagemSistema !== undefined) body.mensagemSistema = rawBody.mensagemSistema;

    const result = await superAdminService.updateGlobalSettings(body);
    
    // Log action
    await auditLogService.log({
      actorId: req.user!.id,
      clinicaId: 'SYSTEM',
      accao: 'UPDATE',
      recurso: 'SETTINGS',
      metadata: body,
      ip: req.ip || null
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
});

// ─── Subscription Management ──────────────────────────────────────────

router.post('/clinicas/:id/subscricao/upgrade', async (req, res, next) => {
  try {
    const { plano, validaAte, valorKz, referenciaInterna, notas } = req.body;
    const userId = req.user!.id;
    const sub = await subscricaoService.criarNovaSubscricao({
      clinicaId: req.params.id,
      plano: plano as Plano,
      estado: EstadoSubscricao.ACTIVA,
      ...(validaAte && { validaAte: new Date(validaAte) }),
      ...(valorKz && { valorKz }),
      ...(referenciaInterna && { referenciaInterna }),
      razao: RazaoMudancaPlano.UPGRADE_MANUAL,
      alteradoPor: userId,
      ...(notas && { notas }),
    });
    res.json({ success: true, data: sub });
  } catch (err) {
    next(err);
  }
});

router.post('/clinicas/:id/subscricao/downgrade', async (req, res, next) => {
  try {
    const { plano, notas } = req.body;
    const userId = req.user!.id;
    const sub = await subscricaoService.criarNovaSubscricao({
      clinicaId: req.params.id,
      plano: plano as Plano,
      estado: EstadoSubscricao.ACTIVA,
      razao: RazaoMudancaPlano.DOWNGRADE_MANUAL,
      alteradoPor: userId,
      ...(notas && { notas }),
    });
    res.json({ success: true, data: sub });
  } catch (err) {
    next(err);
  }
});

router.post('/clinicas/:id/subscricao/reactivar', async (req, res, next) => {
  try {
    const clinica = await subscricaoService.getActual(req.params.id);
    const userId = req.user!.id;
    const sub = await subscricaoService.criarNovaSubscricao({
      clinicaId: req.params.id,
      plano: (clinica as { plano?: Plano })?.plano || Plano.BASICO,
      estado: EstadoSubscricao.ACTIVA,
      razao: RazaoMudancaPlano.REACTIVACAO,
      alteradoPor: userId,
    });
    res.json({ success: true, data: sub });
  } catch (err) {
    next(err);
  }
});

router.patch('/clinicas/:id/suspender', async (req, res, next) => {
  try {
    const schema = z.object({ motivo: z.string().min(1, 'Motivo é obrigatório') });
    const { motivo } = schema.parse(req.body);
    const clinica = await superAdminService.suspenderClinica(req.params.id, motivo, req.user!.id);
    res.json({ success: true, data: clinica });
  } catch (err) {
    next(err);
  }
});

router.post('/clinicas/:id/subscricao/suspender', async (req, res, next) => {
  try {
    await subscricaoService.suspender(req.params.id);
    res.json({ success: true, message: 'Subscrição suspensa com sucesso' });
  } catch (err) {
    next(err);
  }
});

router.get('/subscricoes/a-expirar', async (_req, res, next) => {
  try {
    const clinicas = await subscricaoService.getExpiringSoon();
    res.json({ success: true, data: clinicas });
  } catch (err) {
    next(err);
  }
});

// ─── Impersonation ───

router.post('/impersonar', async (req, res, next) => {
  try {
    const { clinicaId, adminId, motivo } = req.body;
    const userId = req.user!.id;
    const result = await superAdminService.createImpersonation(clinicaId, adminId, motivo, userId);
    res.status(201).json({ success: true, data: result });
  } catch(err) {
    next(err);
  }
});

router.get('/impersonar/historico', async (_req, res, next) => {
  try {
    const result = await superAdminService.getImpersonationHistory();
    res.json({ success: true, data: result });
  } catch(err) {
    next(err);
  }
});

// ─── Observabilidade ───

router.get('/observabilidade/saude', async (_req, res, next) => {
  try {
    const result = await superAdminService.getHealthScores();
    res.json({ success: true, data: result });
  } catch(err) {
    next(err);
  }
});

router.get('/observabilidade/infraestrutura', async (_req, res, next) => {
  try {
    const result = await superAdminService.getInfrastructureStatus();
    res.json({ success: true, data: result });
  } catch(err) {
    next(err);
  }
});

// ─── Financeiro ───

router.get('/financeiro/mrr', async (_req, res, next) => {
  try {
    const result = await superAdminService.getMRRStats();
    res.json({ success: true, data: result });
  } catch(err) {
    next(err);
  }
});

router.get('/financeiro/planos', async (_req, res, next) => {
  try {
    const result = await superAdminService.getPlansDistribution();
    res.json({ success: true, data: result });
  } catch(err) {
    next(err);
  }
});

router.get('/financeiro/cohorts', async (_req, res, next) => {
  try {
    const result = await superAdminService.getCohorts();
    res.json({ success: true, data: result });
  } catch(err) {
    next(err);
  }
});

// ─── Sistema ───

router.get('/sistema/feature-flags', async (_req, res, next) => {
  try {
    const result = await superAdminService.getFeatureFlags();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.patch('/sistema/feature-flags/:codigo', async (req, res, next) => {
  try {
    const { ativo } = req.body;
    const result = await superAdminService.updateFeatureFlag(req.params.codigo, ativo);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
