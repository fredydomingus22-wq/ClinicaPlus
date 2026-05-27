"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apikeys_service_1 = require("../services/apikeys.service");
const types_1 = require("@clinicaplus/types");
const AppError_1 = require("../lib/AppError");
const requirePlan_1 = require("../middleware/requirePlan");
const router = (0, express_1.Router)();
// Todas as rotas de API Keys requerem plano PRO
router.use((0, requirePlan_1.requirePlan)('PRO'));
/**
 * GET /api/api-keys
 * Lista as chaves da clínica.
 */
router.get('/', async (req, res, next) => {
    try {
        const keys = await apikeys_service_1.apiKeysService.list(req.clinica.id);
        res.json({ success: true, data: keys });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /api/api-keys
 * Cria uma nova chave.
 */
router.post('/', async (req, res, next) => {
    try {
        const validated = types_1.ApiKeyCreateSchema.safeParse(req.body);
        if (!validated.success) {
            throw new AppError_1.AppError('Dados inválidos', 400, 'VALIDATION_ERROR');
        }
        const apiKey = await apikeys_service_1.apiKeysService.create(validated.data, req.clinica.id, req.user.id);
        res.status(201).json({ success: true, data: apiKey });
    }
    catch (err) {
        next(err);
    }
});
/**
 * DELETE /api/api-keys/:id
 * Revoga uma chave.
 */
router.delete('/:id', async (req, res, next) => {
    try {
        await apikeys_service_1.apiKeysService.revoke(req.params.id, req.clinica.id, req.user.id);
        res.json({ success: true, message: 'API Key revogada com sucesso' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
