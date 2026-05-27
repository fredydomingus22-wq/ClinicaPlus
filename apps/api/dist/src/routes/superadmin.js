"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireRole_1 = require("../middleware/requireRole");
const superadmin_service_1 = require("../services/superadmin.service");
const subscricao_service_1 = require("../services/subscricao.service");
const types_1 = require("@clinicaplus/types");
const zod_1 = require("zod");
const auditLog_service_1 = require("../services/auditLog.service");
const router = (0, express_1.Router)();
// Apply SUPER_ADMIN role protection to all routes in this router
router.use((0, requireRole_1.requireRole)([types_1.Papel.SUPER_ADMIN]));
/**
 * GET /api/superadmin/stats
 */
router.get('/stats', async (_req, res, next) => {
    try {
        const result = await superadmin_service_1.superAdminService.getGlobalStats();
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /api/superadmin/dashboard
 */
router.get('/dashboard', async (_req, res, next) => {
    try {
        const result = await superadmin_service_1.superAdminService.getDashboardKPIs();
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /api/superadmin/clinicas
 */
router.get('/clinicas', async (req, res, next) => {
    try {
        const query = types_1.ClinicaListQuerySchema.parse(req.query);
        const result = await superadmin_service_1.superAdminService.listClinicas(query);
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /api/superadmin/clinicas/:id
 */
router.get('/clinicas/:id', async (req, res, next) => {
    try {
        const result = await superadmin_service_1.superAdminService.getClinica(req.params.id);
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * PATCH /api/superadmin/clinicas/:id
 */
router.patch('/clinicas/:id', async (req, res, next) => {
    try {
        const updateSchema = zod_1.z.object({
            plano: types_1.PlanoSchema.optional(),
            ativo: zod_1.z.boolean().optional(),
        });
        const body = updateSchema.parse(req.body);
        const data = {};
        if (body.plano)
            data.plano = body.plano;
        if (body.ativo !== undefined)
            data.ativo = body.ativo;
        const result = await superadmin_service_1.superAdminService.updateClinica(req.params.id, data);
        // Log action
        await auditLog_service_1.auditLogService.log({
            actorId: req.user.id,
            clinicaId: req.params.id,
            accao: 'UPDATE',
            recurso: 'CLINICA',
            metadata: body,
            ip: req.ip || null
        });
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * POST /api/superadmin/clinicas
 */
router.post('/clinicas', async (req, res, next) => {
    try {
        const body = types_1.ClinicaCreateSchema.parse(req.body);
        const userId = req.user.id;
        const result = await superadmin_service_1.superAdminService.provisionClinic(body, userId);
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /api/superadmin/users
 */
router.get('/users', async (req, res, next) => {
    try {
        const result = await superadmin_service_1.superAdminService.listUsers(req.query);
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * PATCH /api/superadmin/users/:id
 */
router.patch('/users/:id', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({ ativo: zod_1.z.boolean() });
        const { ativo } = schema.parse(req.body);
        const result = await superadmin_service_1.superAdminService.updateUserStatus(req.params.id, ativo);
        // Log action
        await auditLog_service_1.auditLogService.log({
            actorId: req.user.id,
            clinicaId: 'SYSTEM',
            accao: 'UPDATE',
            recurso: 'USER',
            metadata: { status: ativo, userId: req.params.id },
            ip: req.ip || null
        });
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /api/superadmin/logs
 */
router.get('/logs', async (req, res, next) => {
    try {
        const result = await superadmin_service_1.superAdminService.listLogs(req.query);
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /api/superadmin/settings
 */
router.get('/settings', async (_req, res, next) => {
    try {
        const result = await superadmin_service_1.superAdminService.getGlobalSettings();
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * PATCH /api/superadmin/settings
 */
router.patch('/settings', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({
            modoManutencao: zod_1.z.boolean().optional(),
            registoNovasClinicas: zod_1.z.boolean().optional(),
            maxUploadSizeMb: zod_1.z.number().optional(),
            mensagemSistema: zod_1.z.string().nullable().optional()
        });
        // Filtrar undefined para satisfazer exactOptionalPropertyTypes
        const rawBody = schema.parse(req.body);
        const body = {};
        if (rawBody.modoManutencao !== undefined)
            body.modoManutencao = rawBody.modoManutencao;
        if (rawBody.registoNovasClinicas !== undefined)
            body.registoNovasClinicas = rawBody.registoNovasClinicas;
        if (rawBody.maxUploadSizeMb !== undefined)
            body.maxUploadSizeMb = rawBody.maxUploadSizeMb;
        if (rawBody.mensagemSistema !== undefined)
            body.mensagemSistema = rawBody.mensagemSistema;
        const result = await superadmin_service_1.superAdminService.updateGlobalSettings(body);
        // Log action
        await auditLog_service_1.auditLogService.log({
            actorId: req.user.id,
            clinicaId: 'SYSTEM',
            accao: 'UPDATE',
            recurso: 'SETTINGS',
            metadata: body,
            ip: req.ip || null
        });
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
// ─── Subscription Management ──────────────────────────────────────────
router.post('/clinicas/:id/subscricao/upgrade', async (req, res, next) => {
    try {
        const { plano, validaAte, valorKz, referenciaInterna, notas } = req.body;
        const userId = req.user.id;
        const sub = await subscricao_service_1.subscricaoService.criarNovaSubscricao({
            clinicaId: req.params.id,
            plano: plano,
            estado: types_1.EstadoSubscricao.ACTIVA,
            ...(validaAte && { validaAte: new Date(validaAte) }),
            ...(valorKz && { valorKz }),
            ...(referenciaInterna && { referenciaInterna }),
            razao: types_1.RazaoMudancaPlano.UPGRADE_MANUAL,
            alteradoPor: userId,
            ...(notas && { notas }),
        });
        res.json({ success: true, data: sub });
    }
    catch (err) {
        next(err);
    }
});
router.post('/clinicas/:id/subscricao/downgrade', async (req, res, next) => {
    try {
        const { plano, notas } = req.body;
        const userId = req.user.id;
        const sub = await subscricao_service_1.subscricaoService.criarNovaSubscricao({
            clinicaId: req.params.id,
            plano: plano,
            estado: types_1.EstadoSubscricao.ACTIVA,
            razao: types_1.RazaoMudancaPlano.DOWNGRADE_MANUAL,
            alteradoPor: userId,
            ...(notas && { notas }),
        });
        res.json({ success: true, data: sub });
    }
    catch (err) {
        next(err);
    }
});
router.post('/clinicas/:id/subscricao/reactivar', async (req, res, next) => {
    try {
        const clinica = await subscricao_service_1.subscricaoService.getActual(req.params.id);
        const userId = req.user.id;
        const sub = await subscricao_service_1.subscricaoService.criarNovaSubscricao({
            clinicaId: req.params.id,
            plano: clinica?.plano || types_1.Plano.BASICO,
            estado: types_1.EstadoSubscricao.ACTIVA,
            razao: types_1.RazaoMudancaPlano.REACTIVACAO,
            alteradoPor: userId,
        });
        res.json({ success: true, data: sub });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/clinicas/:id/suspender', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({ motivo: zod_1.z.string().min(1, 'Motivo é obrigatório') });
        const { motivo } = schema.parse(req.body);
        const clinica = await superadmin_service_1.superAdminService.suspenderClinica(req.params.id, motivo, req.user.id);
        res.json({ success: true, data: clinica });
    }
    catch (err) {
        next(err);
    }
});
router.post('/clinicas/:id/subscricao/suspender', async (req, res, next) => {
    try {
        await subscricao_service_1.subscricaoService.suspender(req.params.id);
        res.json({ success: true, message: 'Subscrição suspensa com sucesso' });
    }
    catch (err) {
        next(err);
    }
});
router.get('/subscricoes/a-expirar', async (_req, res, next) => {
    try {
        const clinicas = await subscricao_service_1.subscricaoService.getExpiringSoon();
        res.json({ success: true, data: clinicas });
    }
    catch (err) {
        next(err);
    }
});
// ─── Impersonation ───
router.post('/impersonar', async (req, res, next) => {
    try {
        const { clinicaId, adminId, motivo } = req.body;
        const userId = req.user.id;
        const result = await superadmin_service_1.superAdminService.createImpersonation(clinicaId, adminId, motivo, userId);
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.get('/impersonar/historico', async (_req, res, next) => {
    try {
        const result = await superadmin_service_1.superAdminService.getImpersonationHistory();
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
// ─── Observabilidade ───
router.get('/observabilidade/saude', async (_req, res, next) => {
    try {
        const result = await superadmin_service_1.superAdminService.getHealthScores();
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.get('/observabilidade/infraestrutura', async (_req, res, next) => {
    try {
        const result = await superadmin_service_1.superAdminService.getInfrastructureStatus();
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
// ─── Financeiro ───
router.get('/financeiro/mrr', async (_req, res, next) => {
    try {
        const result = await superadmin_service_1.superAdminService.getMRRStats();
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.get('/financeiro/planos', async (_req, res, next) => {
    try {
        const result = await superadmin_service_1.superAdminService.getPlansDistribution();
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.get('/financeiro/cohorts', async (_req, res, next) => {
    try {
        const result = await superadmin_service_1.superAdminService.getCohorts();
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
// ─── Sistema ───
router.get('/sistema/feature-flags', async (_req, res, next) => {
    try {
        const result = await superadmin_service_1.superAdminService.getFeatureFlags();
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/sistema/feature-flags/:codigo', async (req, res, next) => {
    try {
        const { ativo } = req.body;
        const result = await superadmin_service_1.superAdminService.updateFeatureFlag(req.params.codigo, ativo);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
