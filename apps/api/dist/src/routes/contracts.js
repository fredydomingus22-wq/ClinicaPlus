"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const requireRole_1 = require("../middleware/requireRole");
const contracts_service_1 = require("../services/contracts.service");
const storage_service_1 = require("../services/storage.service");
const AppError_1 = require("../lib/AppError");
const router = (0, express_1.Router)();
const canWrite = (0, requireRole_1.requireRole)([client_1.Papel.ADMIN]);
const canRead = (0, requireRole_1.requireRole)([client_1.Papel.ADMIN, client_1.Papel.MEDICO, client_1.Papel.RECEPCIONISTA]);
const canFinance = (0, requireRole_1.requireRole)([client_1.Papel.ADMIN, client_1.Papel.RECEPCIONISTA]);
const ContractItemType = {
    SERVICO: 'SERVICO',
    PRODUTO: 'PRODUTO',
    TRATAMENTO: 'TRATAMENTO',
};
const serviceItemSchema = zod_1.z.object({
    itemType: zod_1.z.enum([ContractItemType.SERVICO, ContractItemType.PRODUTO, ContractItemType.TRATAMENTO]),
    produtoId: zod_1.z.string().cuid().optional(),
    tipoTratamentoId: zod_1.z.string().cuid().optional(),
    quantidade: zod_1.z.number().int().positive(),
    precoUnitario: zod_1.z.number().int().nonnegative().optional(),
    desconto: zod_1.z.number().int().nonnegative().optional(),
}).superRefine((value, ctx) => {
    if (value.itemType === ContractItemType.TRATAMENTO && !value.tipoTratamentoId) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'tipoTratamentoId é obrigatório para item TRATAMENTO' });
    }
    if ((value.itemType === ContractItemType.SERVICO || value.itemType === ContractItemType.PRODUTO) && !value.produtoId) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'produtoId é obrigatório para item SERVICO/PRODUTO' });
    }
});
const createSchema = zod_1.z.object({
    pacienteId: zod_1.z.string().cuid(),
    titulo: zod_1.z.string().trim().min(3),
    dataInicio: zod_1.z.string().datetime(),
    dataFim: zod_1.z.string().datetime(),
    moeda: zod_1.z.string().trim().min(3).max(3).optional(),
    valorEntrada: zod_1.z.number().int().nonnegative().optional(),
    clausulaRescisao: zod_1.z.string().trim().min(3).optional(),
    observacoes: zod_1.z.string().trim().optional(),
    servicos: zod_1.z.array(serviceItemSchema).min(1),
    planoPagamento: zod_1.z.object({
        tipo: zod_1.z.nativeEnum(client_1.ContractPaymentType),
        parcelas: zod_1.z.number().int().positive().optional(),
        periodicidade: zod_1.z.string().trim().optional(),
        diaVencimento: zod_1.z.number().int().min(1).max(31).optional(),
        jurosMora: zod_1.z.number().int().nonnegative().optional(),
        multa: zod_1.z.number().int().nonnegative().optional(),
    }),
    allowActiveOverride: zod_1.z.boolean().optional(),
});
const statusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.ContractStatus),
});
const paymentSchema = zod_1.z.object({
    faturaId: zod_1.z.string().cuid().optional(),
    valor: zod_1.z.number().positive(),
    metodo: zod_1.z.string().trim().min(2),
    referencia: zod_1.z.string().trim().optional(),
    notas: zod_1.z.string().trim().optional(),
});
const installmentPaySchema = zod_1.z.object({
    faturaId: zod_1.z.string().cuid().optional(),
    metodo: zod_1.z.string().trim().min(2),
    referencia: zod_1.z.string().trim().optional(),
    notas: zod_1.z.string().trim().optional(),
});
const docConfirmSchema = zod_1.z.object({
    nome: zod_1.z.string().trim().min(1),
    path: zod_1.z.string().trim().min(1),
    provider: zod_1.z.enum(['supabase', 'local']),
    mimeType: zod_1.z.string().trim().optional(),
    tamanhoBytes: zod_1.z.number().int().positive().optional(),
    base64Data: zod_1.z.string().optional(),
});
const updateDraftSchema = zod_1.z.object({
    titulo: zod_1.z.string().trim().min(3).optional(),
    dataInicio: zod_1.z.string().datetime().optional(),
    dataFim: zod_1.z.string().datetime().optional(),
    clausulaRescisao: zod_1.z.string().trim().optional(),
    observacoes: zod_1.z.string().trim().optional(),
    valorEntrada: zod_1.z.number().int().nonnegative().optional(),
});
const terminateSchema = zod_1.z.object({
    motivo: zod_1.z.string().trim().min(3),
    dataEfetiva: zod_1.z.string().datetime(),
    saldoAjuste: zod_1.z.number().optional(),
    penalidade: zod_1.z.number().optional(),
});
const renewSchema = zod_1.z.object({
    dataInicio: zod_1.z.string().datetime(),
    dataFim: zod_1.z.string().datetime(),
    observacoes: zod_1.z.string().trim().optional(),
});
const amendmentSchema = zod_1.z.object({
    motivo: zod_1.z.string().trim().min(3),
    effectiveDate: zod_1.z.string().datetime(),
    delta: zod_1.z.record(zod_1.z.any()),
});
const signatureSchema = zod_1.z.object({
    signerType: zod_1.z.enum(['CLINIC', 'PATIENT', 'GUARDIAN']),
    signerName: zod_1.z.string().trim().min(3),
    signerDoc: zod_1.z.string().trim().optional(),
    provider: zod_1.z.string().trim().optional(),
    evidenceJson: zod_1.z.record(zod_1.z.any()).optional(),
});
router.get('/', canRead, async (req, res, next) => {
    try {
        const statusRaw = req.query.status;
        let status;
        if (typeof statusRaw === 'string' && statusRaw.length > 0) {
            const candidate = client_1.ContractStatus[statusRaw];
            if (!candidate) {
                throw new AppError_1.AppError(`Status de contrato inválido: ${statusRaw}`, 400, 'INVALID_CONTRACT_STATUS');
            }
            status = candidate;
        }
        const resolvedStatus = req.user?.papel === client_1.Papel.MEDICO ? client_1.ContractStatus.ACTIVE : status;
        const data = await contracts_service_1.contractsService.list(req.clinica.id, resolvedStatus);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', canRead, async (req, res, next) => {
    try {
        const data = await contracts_service_1.contractsService.getById(req.clinica.id, req.params.id);
        if (req.user?.papel === client_1.Papel.MEDICO && data.status !== client_1.ContractStatus.ACTIVE) {
            throw new AppError_1.AppError('Médico só pode consultar contratos ativos', 403, 'FORBIDDEN_CONTRACT_SCOPE');
        }
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id/events', canRead, async (req, res, next) => {
    try {
        const data = await contracts_service_1.contractsService.listEvents(req.clinica.id, req.params.id);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', canWrite, async (req, res, next) => {
    try {
        const payloadRaw = createSchema.parse(req.body);
        const payload = {
            pacienteId: payloadRaw.pacienteId,
            titulo: payloadRaw.titulo,
            dataInicio: payloadRaw.dataInicio,
            dataFim: payloadRaw.dataFim,
            moeda: payloadRaw.moeda,
            valorEntrada: payloadRaw.valorEntrada,
            clausulaRescisao: payloadRaw.clausulaRescisao,
            observacoes: payloadRaw.observacoes,
            servicos: payloadRaw.servicos,
            planoPagamento: payloadRaw.planoPagamento,
            allowActiveOverride: payloadRaw.allowActiveOverride,
        };
        const data = await contracts_service_1.contractsService.create(req.clinica.id, req.user?.id, payload);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:id/status', canWrite, async (req, res, next) => {
    try {
        const payload = statusSchema.parse(req.body);
        const data = await contracts_service_1.contractsService.updateStatus(req.clinica.id, req.user?.id, req.params.id, payload.status);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:id', canWrite, async (req, res, next) => {
    try {
        const payload = updateDraftSchema.parse(req.body);
        const data = await contracts_service_1.contractsService.updateDraft(req.clinica.id, req.user?.id, req.params.id, payload);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/submit', canWrite, async (req, res, next) => {
    try {
        const data = await contracts_service_1.contractsService.submit(req.clinica.id, req.user?.id, req.params.id);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/activate', canWrite, async (req, res, next) => {
    try {
        const data = await contracts_service_1.contractsService.activate(req.clinica.id, req.user?.id, req.params.id);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/terminate', canWrite, async (req, res, next) => {
    try {
        const payload = terminateSchema.parse(req.body);
        const data = await contracts_service_1.contractsService.terminate(req.clinica.id, req.user?.id, req.params.id, payload);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/renew', canWrite, async (req, res, next) => {
    try {
        const payload = renewSchema.parse(req.body);
        const data = await contracts_service_1.contractsService.renew(req.clinica.id, req.user?.id, req.params.id, payload);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/amendments', canWrite, async (req, res, next) => {
    try {
        const payload = amendmentSchema.parse(req.body);
        const data = await contracts_service_1.contractsService.amend(req.clinica.id, req.user?.id, req.params.id, payload);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/signatures', canWrite, async (req, res, next) => {
    try {
        const payload = signatureSchema.parse(req.body);
        const data = await contracts_service_1.contractsService.sign(req.clinica.id, req.user?.id, req.params.id, payload);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/payments', canFinance, async (req, res, next) => {
    try {
        const payload = paymentSchema.parse(req.body);
        const data = await contracts_service_1.contractsService.registerPaymentWithReceipt(req.clinica.id, req.user?.id, req.params.id, payload);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/installments/:numero/pay', canFinance, async (req, res, next) => {
    try {
        const payload = installmentPaySchema.parse(req.body);
        const numero = Number(req.params.numero);
        if (!Number.isInteger(numero) || numero <= 0) {
            throw new AppError_1.AppError('Número de parcela inválido', 400, 'INVALID_INSTALLMENT_NUMBER');
        }
        const data = await contracts_service_1.contractsService.payInstallmentWithReceipt(req.clinica.id, req.user?.id, req.params.id, numero, payload);
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/documents/upload-url', canWrite, async (req, res, next) => {
    try {
        const fileName = String(req.body?.fileName || 'contrato.pdf');
        const data = await storage_service_1.storageService.getUploadUrl(req.clinica.id, 'contract_document', req.params.id, fileName);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/documents/confirm', canWrite, async (req, res, next) => {
    try {
        const payload = docConfirmSchema.parse(req.body);
        const url = await storage_service_1.storageService.confirmUpload(req.clinica.id, 'contract_document', req.params.id, payload.path, payload.provider, payload.base64Data);
        const data = await contracts_service_1.contractsService.addDocument(req.clinica.id, req.params.id, {
            nome: payload.nome,
            url,
            mimeType: payload.mimeType,
            tamanhoBytes: payload.tamanhoBytes,
        });
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
