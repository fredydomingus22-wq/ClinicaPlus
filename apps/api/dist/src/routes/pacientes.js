"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const types_1 = require("@clinicaplus/types");
const requirePermission_1 = require("../middleware/requirePermission");
const storage_service_1 = require("../services/storage.service");
const pacientes_service_1 = require("../services/pacientes.service");
const router = (0, express_1.Router)();
/**
 * GET /pacientes
 * Auth: paciente:read
 */
router.get('/', (0, requirePermission_1.requirePermission)('paciente', 'read'), async (req, res, next) => {
    try {
        const query = types_1.PacienteListQuerySchema.parse(req.query);
        const result = await pacientes_service_1.pacientesService.list(req.clinica.id, query);
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /pacientes/:id
 * Auth: ADMIN, MEDICO, RECEPCIONISTA can get any.
 *       PACIENTE can only get their own.
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { papel } = req.user;
        if (papel === types_1.Papel.PACIENTE) {
            // PACIENTE may only access their own record
            const paciente = await pacientes_service_1.pacientesService.getOne(req.params.id, req.clinica.id);
            if (paciente.utilizadorId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: { message: 'Acesso não permitido', code: 'FORBIDDEN' },
                });
            }
            return res.json({ success: true, data: paciente });
        }
        // ADMIN, MEDICO, RECEPCIONISTA
        const paciente = await pacientes_service_1.pacientesService.getOne(req.params.id, req.clinica.id);
        return res.json({ success: true, data: paciente });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * POST /pacientes
 * Auth: paciente:create
 */
router.post('/', (0, requirePermission_1.requirePermission)('paciente', 'create'), async (req, res, next) => {
    try {
        const body = types_1.PacienteCreateSchema.parse(req.body);
        const paciente = await pacientes_service_1.pacientesService.create(body, req.clinica.id);
        return res.status(201).json({ success: true, data: paciente });
    }
    catch (err) {
        return next(err);
    }
});
router.patch('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        const { papel, id: userId } = req.user;
        // 1. If PACIENTE, verify ownership
        if (papel === types_1.Papel.PACIENTE) {
            const paciente = await pacientes_service_1.pacientesService.getOne(id, req.clinica.id);
            if (paciente.utilizadorId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: { message: 'Acesso não permitido', code: 'FORBIDDEN' },
                });
            }
        }
        else if (papel !== types_1.Papel.ADMIN && papel !== types_1.Papel.RECEPCIONISTA) {
            // MEDICO cannot update patients via this route
            return res.status(403).json({
                success: false,
                error: { message: 'Acesso não permitido', code: 'FORBIDDEN' },
            });
        }
        // 2. Validate and Update
        const body = types_1.PacienteUpdateSchema.parse(req.body);
        const paciente = await pacientes_service_1.pacientesService.update(id, body, req.clinica.id);
        return res.json({ success: true, data: paciente });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * POST /pacientes/:id/avatar-upload-url
 */
router.post('/:id/avatar-upload-url', async (req, res, next) => {
    try {
        const id = req.params.id;
        const { papel, id: userId } = req.user;
        if (papel === types_1.Papel.PACIENTE) {
            const paciente = await pacientes_service_1.pacientesService.getOne(id, req.clinica.id);
            if (paciente.utilizadorId !== userId) {
                return res.status(403).json({ success: false, error: { message: 'Acesso não permitido', code: 'FORBIDDEN' } });
            }
        }
        else if (papel !== types_1.Papel.ADMIN && papel !== types_1.Papel.RECEPCIONISTA && papel !== types_1.Papel.MEDICO) {
            return res.status(403).json({ success: false, error: { message: 'Acesso não permitido', code: 'FORBIDDEN' } });
        }
        const { fileName } = req.body;
        const result = await storage_service_1.storageService.getUploadUrl(req.clinica.id, 'paciente_avatar', id, fileName || 'avatar.png');
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * POST /pacientes/:id/avatar-confirm
 */
router.post('/:id/avatar-confirm', async (req, res, next) => {
    try {
        const id = req.params.id;
        const { papel, id: userId } = req.user;
        if (papel === types_1.Papel.PACIENTE) {
            const paciente = await pacientes_service_1.pacientesService.getOne(id, req.clinica.id);
            if (paciente.utilizadorId !== userId) {
                return res.status(403).json({ success: false, error: { message: 'Acesso não permitido', code: 'FORBIDDEN' } });
            }
        }
        else if (papel !== types_1.Papel.ADMIN && papel !== types_1.Papel.RECEPCIONISTA && papel !== types_1.Papel.MEDICO) {
            return res.status(403).json({ success: false, error: { message: 'Acesso não permitido', code: 'FORBIDDEN' } });
        }
        const { path, provider, base64Data } = req.body;
        const url = await storage_service_1.storageService.confirmUpload(req.clinica.id, 'paciente_avatar', id, path, provider, base64Data);
        return res.json({ success: true, data: { avatarUrl: url } });
    }
    catch (err) {
        return next(err);
    }
});
exports.default = router;
