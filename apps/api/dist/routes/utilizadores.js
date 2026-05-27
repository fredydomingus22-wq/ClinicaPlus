"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const permissao_service_1 = require("../services/permissao.service");
const auditLog_service_1 = require("../services/auditLog.service");
const authenticate_1 = require("../middleware/authenticate");
const tenant_1 = require("../middleware/tenant");
const requireRole_1 = require("../middleware/requireRole");
const types_1 = require("@clinicaplus/types");
const storage_service_1 = require("../services/storage.service");
const router = (0, express_1.Router)();
/**
 * GET /utilizadores/:id/permissoes
 * Lista permissões base do role + overrides.
 */
router.get('/:id/permissoes', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.SUPER_ADMIN]), async (req, res, next) => {
    try {
        const id = req.params.id;
        const clinicaId = req.clinica?.id;
        if (!clinicaId)
            throw new AppError_1.AppError('Clínica não identificada', 400);
        const utilizador = await prisma_1.prisma.utilizador.findUnique({
            where: { id, clinicaId },
            include: {
                permissoes: {
                    include: { permissao: true }
                }
            }
        });
        if (!utilizador) {
            throw new AppError_1.AppError('Utilizador não encontrado', 404);
        }
        // Buscar todas as permissões do sistema
        const todasPermissoes = await prisma_1.prisma.permissao.findMany();
        // Buscar permissões da role
        const rolePermissoes = await prisma_1.prisma.rolePermissao.findMany({
            where: { papel: utilizador.papel },
            include: { permissao: true }
        });
        const rolePermCodes = new Set(rolePermissoes.map(rp => rp.permissao.codigo));
        const overrides = new Map(utilizador.permissoes.map(up => [up.permissao.codigo, up.tipo]));
        const resultado = todasPermissoes.map(p => {
            const override = overrides.get(p.codigo);
            const base = rolePermCodes.has(p.codigo);
            let efectivo = base;
            if (override === 'GRANT')
                efectivo = true;
            if (override === 'DENY')
                efectivo = false;
            return {
                codigo: p.codigo,
                descricao: p.descricao,
                modulo: p.modulo,
                base,
                override: override || null,
                efectivo
            };
        });
        res.json({ success: true, data: resultado });
    }
    catch (err) {
        next(err);
    }
});
/**
 * PUT /utilizadores/:id/permissoes/:codigo
 * Define ou remove um override de permissão.
 */
router.put('/:id/permissoes/:codigo', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requireRole_1.requireRole)([types_1.Papel.ADMIN, types_1.Papel.SUPER_ADMIN]), async (req, res, next) => {
    try {
        const id = req.params.id;
        const codigo = req.params.codigo;
        const { tipo } = req.body; // GRANT | DENY | RESET
        const clinicaId = req.clinica?.id;
        if (!clinicaId)
            throw new AppError_1.AppError('Clínica não identificada', 400);
        const utilizador = await prisma_1.prisma.utilizador.findUnique({
            where: { id, clinicaId }
        });
        if (!utilizador) {
            throw new AppError_1.AppError('Utilizador não encontrado', 404);
        }
        const permissao = await prisma_1.prisma.permissao.findUnique({
            where: { codigo }
        });
        if (!permissao) {
            throw new AppError_1.AppError('Permissão não encontrada', 404);
        }
        if (tipo === 'RESET') {
            await prisma_1.prisma.utilizadorPermissao.deleteMany({
                where: {
                    utilizadorId: id,
                    permissaoId: permissao.id
                }
            });
            await auditLog_service_1.auditLogService.log({
                actorId: req.user.id,
                clinicaId,
                accao: 'RESET',
                recurso: 'permissao',
                recursoId: id,
                metadata: { codigo }
            });
        }
        else if (tipo === 'GRANT' || tipo === 'DENY') {
            await prisma_1.prisma.utilizadorPermissao.upsert({
                where: {
                    utilizadorId_permissaoId: {
                        utilizadorId: id,
                        permissaoId: permissao.id
                    }
                },
                update: { tipo },
                create: {
                    utilizadorId: id,
                    permissaoId: permissao.id,
                    tipo,
                    criadoPor: req.user.id
                }
            });
            await auditLog_service_1.auditLogService.log({
                actorId: req.user.id,
                clinicaId,
                accao: tipo, // GRANT | DENY
                recurso: 'permissao',
                recursoId: id,
                metadata: { codigo }
            });
        }
        else {
            throw new AppError_1.AppError('Tipo de override inválido. Use GRANT, DENY ou RESET.', 400);
        }
        // IMPORTANT: Invalida o cache
        await permissao_service_1.permissaoService.invalidateCache(id);
        res.json({ success: true, message: 'Permissão actualizada com sucesso' });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /utilizadores/me/avatar-upload-url
 * Auth: ALL — generates upload url for the user avatar
 */
router.post('/me/avatar-upload-url', authenticate_1.authenticate, tenant_1.tenantMiddleware, async (req, res, next) => {
    try {
        const { fileName } = req.body;
        const result = await storage_service_1.storageService.getUploadUrl(req.clinica.id, 'user_avatar', req.user.id, fileName || 'avatar.png');
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
/**
 * POST /utilizadores/me/avatar-confirm
 * Auth: ALL — confirms avatar upload and saves it to db
 */
router.post('/me/avatar-confirm', authenticate_1.authenticate, tenant_1.tenantMiddleware, async (req, res, next) => {
    try {
        const { path, provider, base64Data } = req.body;
        const url = await storage_service_1.storageService.confirmUpload(req.clinica.id, 'user_avatar', req.user.id, path, provider, base64Data);
        return res.json({ success: true, data: { avatarUrl: url } });
    }
    catch (err) {
        return next(err);
    }
});
exports.default = router;
