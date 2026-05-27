"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const types_1 = require("@clinicaplus/types");
const clinicas_service_1 = require("../services/clinicas.service");
const authenticate_1 = require("../middleware/authenticate");
const requireRole_1 = require("../middleware/requireRole");
const types_2 = require("@clinicaplus/types");
const AppError_1 = require("../lib/AppError");
const storage_service_1 = require("../services/storage.service");
const router = (0, express_1.Router)();
const COOKIE_NAME = 'cp_refresh';
const COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
};
/**
 * POST /clinicas/registar
 * Public — registers a new clinic and returns accessToken + ClinicaDTO.
 */
router.post('/registar', async (req, res, next) => {
    try {
        const body = types_1.ClinicaCreateSchema.parse(req.body);
        const result = await clinicas_service_1.clinicasService.registar(body);
        // Set refresh cookie so ADMIN is immediately logged in
        res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
        return res.status(201).json({
            success: true,
            data: { clinica: result.clinica, accessToken: result.accessToken },
        });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /clinicas/verificar-slug/:slug
 * Public — checks if a slug is available.
 */
router.get('/verificar-slug/:slug', async (req, res, next) => {
    try {
        const result = await clinicas_service_1.clinicasService.verificarSlug(req.params.slug);
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * GET /clinicas/me
 * Auth: ADMIN — returns the current clinic details.
 */
router.get('/me', authenticate_1.authenticate, (0, requireRole_1.requireRole)([types_2.Papel.ADMIN, types_2.Papel.MEDICO, types_2.Papel.RECEPCIONISTA, types_2.Papel.PACIENTE]), async (req, res, next) => {
    try {
        const clinica = await clinicas_service_1.clinicasService.getMe(req.user.clinicaId);
        return res.json({ success: true, data: clinica });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * PATCH /clinicas/me
 * Auth: ADMIN — updates editable clinic fields (slug and plano not allowed).
 */
router.patch('/me', authenticate_1.authenticate, (0, requireRole_1.requireRole)([types_2.Papel.ADMIN]), async (req, res, next) => {
    try {
        const body = types_1.ClinicaUpdateSchema.parse(req.body);
        const clinica = await clinicas_service_1.clinicasService.update(req.user.clinicaId, body);
        return res.json({ success: true, data: clinica });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * PUT /clinicas/me/contactos
 * Auth: ADMIN — updates clinic contacts list.
 */
router.put('/me/contactos', authenticate_1.authenticate, (0, requireRole_1.requireRole)([types_2.Papel.ADMIN]), async (req, res, next) => {
    try {
        const { contactos } = req.body;
        if (!contactos || !Array.isArray(contactos)) {
            throw new AppError_1.AppError('A lista de contactos é obrigatória e deve ser um array.', 400, 'VALIDATION_ERROR');
        }
        const clinica = await clinicas_service_1.clinicasService.updateContactos(req.user.clinicaId, contactos);
        return res.json({ success: true, data: clinica, message: 'Contactos atualizados com sucesso' });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * POST /clinicas/me/logo-upload-url
 * Auth: ADMIN — generates upload url for the clinic logo
 */
router.post('/me/logo-upload-url', authenticate_1.authenticate, (0, requireRole_1.requireRole)([types_2.Papel.ADMIN]), async (req, res, next) => {
    try {
        const { fileName } = req.body;
        const result = await storage_service_1.storageService.getUploadUrl(req.user.clinicaId, 'clinica_logo', req.user.clinicaId, fileName || 'logo.png');
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * POST /clinicas/me/logo-confirm
 * Auth: ADMIN — confirms logo upload and saves it to db
 */
router.post('/me/logo-confirm', authenticate_1.authenticate, (0, requireRole_1.requireRole)([types_2.Papel.ADMIN]), async (req, res, next) => {
    try {
        const { path, provider, base64Data } = req.body;
        const url = await storage_service_1.storageService.confirmUpload(req.user.clinicaId, 'clinica_logo', req.user.clinicaId, path, provider, base64Data);
        return res.json({ success: true, data: { logoUrl: url } });
    }
    catch (err) {
        return next(err);
    }
});
exports.default = router;
