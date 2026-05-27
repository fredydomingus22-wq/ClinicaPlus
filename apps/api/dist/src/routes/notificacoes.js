"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificacoes_service_1 = require("../services/notificacoes.service");
const router = (0, express_1.Router)();
/**
 * GET /api/notificacoes
 * List last 50 notifications for the authenticated user.
 */
router.get('/', async (req, res, next) => {
    try {
        const result = await notificacoes_service_1.notificacoesService.listByUser(req.user.id);
        // Disable ETag for this endpoint to prevent incorrect 204 responses
        res.removeHeader('ETag');
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
/**
 * PATCH /api/notificacoes/read-all
 * Mark all notifications for the user as read.
 */
router.patch('/read-all', async (req, res, next) => {
    try {
        await notificacoes_service_1.notificacoesService.markAllAsRead(req.user.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
/**
 * PATCH /api/notificacoes/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', async (req, res, next) => {
    try {
        const id = req.params.id;
        await notificacoes_service_1.notificacoesService.markAsRead(id, req.user.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
