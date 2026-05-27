"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const requireRole_1 = require("../middleware/requireRole");
const AppError_1 = require("../lib/AppError");
const client_1 = require("@prisma/client");
/**
 * Config-Tratamentos Router
 * CRUD para tipos de exame e tipos de tratamento do catálogo da clínica.
 */
const router = (0, express_1.Router)();
// ─── TIPOS DE EXAME ───────────────────────────────────────────────────────────
/** Lista todos os tipos de exame da clínica */
router.get('/tipos-exame', async (req, res, next) => {
    try {
        const tipos = await prisma_1.prisma.tipoExameClinica.findMany({
            where: { clinicaId: req.clinica.id, ativo: true },
            orderBy: { nome: 'asc' },
        });
        res.json({ data: tipos });
    }
    catch (err) {
        next(err);
    }
});
/** Cria um novo tipo de exame */
router.post('/tipos-exame', (0, requireRole_1.requireRole)(['ADMIN']), async (req, res, next) => {
    try {
        const { nome, descricao, preco } = req.body;
        if (!nome)
            throw new AppError_1.AppError('Campo nome é obrigatório', 400);
        const tipo = await prisma_1.prisma.tipoExameClinica.create({
            data: {
                clinicaId: req.clinica.id,
                nome,
                ...(descricao !== undefined && { descricao }),
                ...(preco !== undefined && { preco }),
            },
        });
        res.status(201).json({ data: tipo });
    }
    catch (err) {
        if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            return next(new AppError_1.AppError('Já existe um tipo de exame com este nome nesta clínica', 400, 'DUPLICATE_ENTRY'));
        }
        next(err);
    }
});
/** Actualiza um tipo de exame */
router.patch('/tipos-exame/:id', (0, requireRole_1.requireRole)(['ADMIN']), async (req, res, next) => {
    try {
        const id = req.params.id;
        const tipo = await prisma_1.prisma.tipoExameClinica.findFirst({
            where: { id, clinicaId: req.clinica.id },
        });
        if (!tipo)
            throw new AppError_1.AppError('Tipo de exame não encontrado', 404);
        const updated = await prisma_1.prisma.tipoExameClinica.update({
            where: { id },
            data: req.body,
        });
        res.json({ data: updated });
    }
    catch (err) {
        next(err);
    }
});
/** Remove (desactiva) um tipo de exame */
router.delete('/tipos-exame/:id', (0, requireRole_1.requireRole)(['ADMIN']), async (req, res, next) => {
    try {
        const id = req.params.id;
        await prisma_1.prisma.tipoExameClinica.updateMany({
            where: { id, clinicaId: req.clinica.id },
            data: { ativo: false },
        });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
// ─── TIPOS DE TRATAMENTO ──────────────────────────────────────────────────────
/** Lista todos os tipos de tratamento da clínica */
router.get('/tipos-tratamento', async (req, res, next) => {
    try {
        const tipos = await prisma_1.prisma.tipoTratamento.findMany({
            where: { clinicaId: req.clinica.id, ativo: true },
            orderBy: { nome: 'asc' },
        });
        res.json({ data: tipos });
    }
    catch (err) {
        next(err);
    }
});
/** Cria um novo tipo de tratamento */
router.post('/tipos-tratamento', (0, requireRole_1.requireRole)(['ADMIN']), async (req, res, next) => {
    try {
        const { nome, descricao, duracaoMin, preco } = req.body;
        if (!nome)
            throw new AppError_1.AppError('Campo nome é obrigatório', 400);
        const tipo = await prisma_1.prisma.tipoTratamento.create({
            data: {
                clinicaId: req.clinica.id,
                nome,
                ...(descricao !== undefined && { descricao }),
                ...(duracaoMin !== undefined && { duracaoMin }),
                ...(preco !== undefined && { preco }),
            },
        });
        res.status(201).json({ data: tipo });
    }
    catch (err) {
        if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            return next(new AppError_1.AppError('Já existe um tipo de tratamento com este nome nesta clínica', 400, 'DUPLICATE_ENTRY'));
        }
        next(err);
    }
});
/** Actualiza um tipo de tratamento */
router.patch('/tipos-tratamento/:id', (0, requireRole_1.requireRole)(['ADMIN']), async (req, res, next) => {
    try {
        const id = req.params.id;
        const tipo = await prisma_1.prisma.tipoTratamento.findFirst({
            where: { id, clinicaId: req.clinica.id },
        });
        if (!tipo)
            throw new AppError_1.AppError('Tipo de tratamento não encontrado', 404);
        const updated = await prisma_1.prisma.tipoTratamento.update({
            where: { id },
            data: req.body,
        });
        res.json({ data: updated });
    }
    catch (err) {
        next(err);
    }
});
/** Remove (desactiva) um tipo de tratamento */
router.delete('/tipos-tratamento/:id', (0, requireRole_1.requireRole)(['ADMIN']), async (req, res, next) => {
    try {
        const id = req.params.id;
        await prisma_1.prisma.tipoTratamento.updateMany({
            where: { id, clinicaId: req.clinica.id },
            data: { ativo: false },
        });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
