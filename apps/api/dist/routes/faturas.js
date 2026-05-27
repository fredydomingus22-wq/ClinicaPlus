"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnularSchema = exports.faturasRouter = void 0;
const express_1 = require("express");
const faturas_service_1 = require("../services/faturas.service");
const types_1 = require("@clinicaplus/types");
const zod_1 = require("zod");
const requirePermission_1 = require("../middleware/requirePermission");
const logger_1 = require("../lib/logger");
exports.faturasRouter = (0, express_1.Router)();
// Apenas utilizadores com permissão fatura:create podem criar faturas
exports.faturasRouter.post('/', (0, requirePermission_1.requirePermission)('fatura', 'create'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const utilizadorId = req.user.id;
        const data = types_1.FaturaCreateSchema.parse(req.body);
        const fatura = await faturas_service_1.faturasService.create(data, clinicaId, utilizadorId);
        res.status(201).json({ success: true, data: fatura });
    }
    catch (err) {
        next(err);
    }
});
exports.faturasRouter.get('/', (0, requirePermission_1.requirePermission)('fatura', 'read'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const filters = req.query;
        const result = await faturas_service_1.faturasService.list(filters, clinicaId);
        res.json({ success: true, ...result });
    }
    catch (err) {
        next(err);
    }
});
exports.faturasRouter.get('/itens-facturaveis', (0, requirePermission_1.requirePermission)('fatura', 'read'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { busca, tipo } = req.query;
        const itens = await faturas_service_1.faturasService.listItensFacturaveis(clinicaId, busca, tipo);
        res.json({ success: true, data: itens });
    }
    catch (err) {
        next(err);
    }
});
exports.faturasRouter.get('/:id', (0, requirePermission_1.requirePermission)('fatura', 'read'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const faturaId = req.params.id;
        if (!faturaId)
            return; // Type guard
        const fatura = await faturas_service_1.faturasService.getOne(faturaId, clinicaId);
        res.json({ success: true, data: fatura });
    }
    catch (err) {
        next(err);
    }
});
exports.faturasRouter.patch('/:id/emitir', (0, requirePermission_1.requirePermission)('fatura', 'create'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const faturaId = req.params.id;
        if (!faturaId)
            return; // Type guard
        const utilizadorId = req.user.id;
        const fatura = await faturas_service_1.faturasService.emitir(faturaId, clinicaId, utilizadorId);
        res.json({ success: true, data: fatura });
    }
    catch (err) {
        next(err);
    }
});
exports.AnularSchema = zod_1.z.object({
    motivo: zod_1.z.string().min(1, 'Motivo da anulação é obrigatório')
});
exports.faturasRouter.patch('/:id/anular', (0, requirePermission_1.requirePermission)('fatura', 'void'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const faturaId = req.params.id;
        if (!faturaId)
            return;
        const utilizadorId = req.user.id;
        const data = exports.AnularSchema.parse(req.body);
        const fatura = await faturas_service_1.faturasService.criarNotaCredito(faturaId, clinicaId, data.motivo, utilizadorId);
        res.json({ success: true, data: fatura });
    }
    catch (err) {
        next(err);
    }
});
exports.faturasRouter.post('/:id/nota-debito', (0, requirePermission_1.requirePermission)('fatura', 'create'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const faturaId = req.params.id;
        if (!faturaId)
            return;
        const utilizadorId = req.user.id;
        const data = types_1.NotaDebitoCreateSchema.parse(req.body);
        const fatura = await faturas_service_1.faturasService.criarNotaDebito(faturaId, clinicaId, data, utilizadorId);
        res.json({ success: true, data: fatura });
    }
    catch (err) {
        next(err);
    }
});
// Pagamentos associados a uma fatura
exports.faturasRouter.post('/:id/pagamentos', (0, requirePermission_1.requirePermission)('pagamento', 'create'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const faturaId = req.params.id;
        if (!faturaId)
            return;
        const utilizadorId = req.user.id;
        const payload = { ...req.body, faturaId };
        const parsed = types_1.PagamentoCreateSchema.safeParse(payload);
        if (!parsed.success) {
            logger_1.logger.warn({
                clinicaId,
                utilizadorId,
                faturaId,
                body: req.body,
                issues: parsed.error.issues.map((i) => ({
                    path: i.path.join('.'),
                    message: i.message,
                    code: i.code,
                })),
            }, 'Validação falhou ao registar pagamento');
            throw parsed.error;
        }
        const pagamento = await faturas_service_1.faturasService.registarPagamento(faturaId, parsed.data, clinicaId, utilizadorId);
        res.status(201).json({ success: true, data: pagamento });
    }
    catch (err) {
        next(err);
    }
});
// Ciclo de Seguro
exports.faturasRouter.patch('/pagamentos/:pagamentoId/submeter-seguro', (0, requirePermission_1.requirePermission)('pagamento', 'create'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { pagamentoId } = req.params;
        await faturas_service_1.faturasService.submeterSeguro(pagamentoId, clinicaId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
exports.faturasRouter.patch('/pagamentos/:pagamentoId/registar-resposta-seguro', (0, requirePermission_1.requirePermission)('pagamento', 'create'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { pagamentoId } = req.params;
        const data = req.body;
        await faturas_service_1.faturasService.registarRespostaSeguro(pagamentoId, clinicaId, data);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
