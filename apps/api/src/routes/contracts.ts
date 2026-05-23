import { Router } from 'express';
import { ContractPaymentType, ContractStatus, Papel } from '@prisma/client';
import { z } from 'zod';
import { requireRole } from '../middleware/requireRole';
import { contractsService } from '../services/contracts.service';
import { storageService } from '../services/storage.service';
import { AppError } from '../lib/AppError';

const router = Router();
const canWrite = requireRole([Papel.ADMIN]);
const canRead = requireRole([Papel.ADMIN, Papel.MEDICO, Papel.RECEPCIONISTA]);
const canFinance = requireRole([Papel.ADMIN, Papel.RECEPCIONISTA]);
const ContractItemType = {
  SERVICO: 'SERVICO',
  PRODUTO: 'PRODUTO',
  TRATAMENTO: 'TRATAMENTO',
} as const;

const serviceItemSchema = z.object({
  itemType: z.enum([ContractItemType.SERVICO, ContractItemType.PRODUTO, ContractItemType.TRATAMENTO]),
  produtoId: z.string().cuid().optional(),
  tipoTratamentoId: z.string().cuid().optional(),
  quantidade: z.number().int().positive(),
  precoUnitario: z.number().int().nonnegative().optional(),
  desconto: z.number().int().nonnegative().optional(),
}).superRefine((value, ctx) => {
  if (value.itemType === ContractItemType.TRATAMENTO && !value.tipoTratamentoId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'tipoTratamentoId é obrigatório para item TRATAMENTO' });
  }
  if ((value.itemType === ContractItemType.SERVICO || value.itemType === ContractItemType.PRODUTO) && !value.produtoId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'produtoId é obrigatório para item SERVICO/PRODUTO' });
  }
});

const createSchema = z.object({
  pacienteId: z.string().cuid(),
  titulo: z.string().trim().min(3),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
  moeda: z.string().trim().min(3).max(3).optional(),
  valorEntrada: z.number().int().nonnegative().optional(),
  clausulaRescisao: z.string().trim().min(3).optional(),
  observacoes: z.string().trim().optional(),
  servicos: z.array(serviceItemSchema).min(1),
  planoPagamento: z.object({
    tipo: z.nativeEnum(ContractPaymentType),
    parcelas: z.number().int().positive().optional(),
    periodicidade: z.string().trim().optional(),
    diaVencimento: z.number().int().min(1).max(31).optional(),
    jurosMora: z.number().int().nonnegative().optional(),
    multa: z.number().int().nonnegative().optional(),
  }),
  allowActiveOverride: z.boolean().optional(),
});

const statusSchema = z.object({
  status: z.nativeEnum(ContractStatus),
});
const paymentSchema = z.object({
  faturaId: z.string().cuid().optional(),
  valor: z.number().positive(),
  metodo: z.string().trim().min(2),
  referencia: z.string().trim().optional(),
  notas: z.string().trim().optional(),
});
const installmentPaySchema = z.object({
  faturaId: z.string().cuid().optional(),
  metodo: z.string().trim().min(2),
  referencia: z.string().trim().optional(),
  notas: z.string().trim().optional(),
});
const docConfirmSchema = z.object({
  nome: z.string().trim().min(1),
  path: z.string().trim().min(1),
  provider: z.enum(['supabase', 'local']),
  mimeType: z.string().trim().optional(),
  tamanhoBytes: z.number().int().positive().optional(),
  base64Data: z.string().optional(),
});
const updateDraftSchema = z.object({
  titulo: z.string().trim().min(3).optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  clausulaRescisao: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
  valorEntrada: z.number().int().nonnegative().optional(),
});
const terminateSchema = z.object({
  motivo: z.string().trim().min(3),
  dataEfetiva: z.string().datetime(),
  saldoAjuste: z.number().optional(),
  penalidade: z.number().optional(),
});
const renewSchema = z.object({
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
  observacoes: z.string().trim().optional(),
});
const amendmentSchema = z.object({
  motivo: z.string().trim().min(3),
  effectiveDate: z.string().datetime(),
  delta: z.record(z.any()),
});
const signatureSchema = z.object({
  signerType: z.enum(['CLINIC', 'PATIENT', 'GUARDIAN']),
  signerName: z.string().trim().min(3),
  signerDoc: z.string().trim().optional(),
  provider: z.string().trim().optional(),
  evidenceJson: z.record(z.any()).optional(),
});

router.get('/', canRead, async (req, res, next) => {
  try {
    const statusRaw = req.query.status;
    let status: ContractStatus | undefined;
    if (typeof statusRaw === 'string' && statusRaw.length > 0) {
      const candidate = ContractStatus[statusRaw as keyof typeof ContractStatus];
      if (!candidate) {
        throw new AppError(`Status de contrato inválido: ${statusRaw}`, 400, 'INVALID_CONTRACT_STATUS');
      }
      status = candidate;
    }
    const resolvedStatus = req.user?.papel === Papel.MEDICO ? ContractStatus.ACTIVE : status;
    const data = await contractsService.list(req.clinica.id, resolvedStatus);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', canRead, async (req, res, next) => {
  try {
    const data = await contractsService.getById(req.clinica.id, req.params.id as string);
    if (req.user?.papel === Papel.MEDICO && data.status !== ContractStatus.ACTIVE) {
      throw new AppError('Médico só pode consultar contratos ativos', 403, 'FORBIDDEN_CONTRACT_SCOPE');
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/events', canRead, async (req, res, next) => {
  try {
    const data = await contractsService.listEvents(req.clinica.id, req.params.id as string);
    res.json({ success: true, data });
  } catch (err) {
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
    const data = await contractsService.create(req.clinica.id, req.user?.id, payload as any);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', canWrite, async (req, res, next) => {
  try {
    const payload = statusSchema.parse(req.body);
    const data = await contractsService.updateStatus(req.clinica.id, req.user?.id, req.params.id as string, payload.status);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', canWrite, async (req, res, next) => {
  try {
    const payload = updateDraftSchema.parse(req.body);
    const data = await contractsService.updateDraft(req.clinica.id, req.user?.id, req.params.id as string, payload);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/submit', canWrite, async (req, res, next) => {
  try {
    const data = await contractsService.submit(req.clinica.id, req.user?.id, req.params.id as string);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/activate', canWrite, async (req, res, next) => {
  try {
    const data = await contractsService.activate(req.clinica.id, req.user?.id, req.params.id as string);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/terminate', canWrite, async (req, res, next) => {
  try {
    const payload = terminateSchema.parse(req.body);
    const data = await contractsService.terminate(req.clinica.id, req.user?.id, req.params.id as string, payload);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/renew', canWrite, async (req, res, next) => {
  try {
    const payload = renewSchema.parse(req.body);
    const data = await contractsService.renew(req.clinica.id, req.user?.id, req.params.id as string, payload);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/amendments', canWrite, async (req, res, next) => {
  try {
    const payload = amendmentSchema.parse(req.body);
    const data = await contractsService.amend(req.clinica.id, req.user?.id, req.params.id as string, payload);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/signatures', canWrite, async (req, res, next) => {
  try {
    const payload = signatureSchema.parse(req.body);
    const data = await contractsService.sign(req.clinica.id, req.user?.id, req.params.id as string, payload);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/payments', canFinance, async (req, res, next) => {
  try {
    const payload = paymentSchema.parse(req.body);
    const data = await contractsService.registerPaymentWithReceipt(req.clinica.id, req.user?.id, req.params.id as string, payload);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/installments/:numero/pay', canFinance, async (req, res, next) => {
  try {
    const payload = installmentPaySchema.parse(req.body);
    const numero = Number(req.params.numero);
    if (!Number.isInteger(numero) || numero <= 0) {
      throw new AppError('Número de parcela inválido', 400, 'INVALID_INSTALLMENT_NUMBER');
    }
    const data = await contractsService.payInstallmentWithReceipt(req.clinica.id, req.user?.id, req.params.id as string, numero, payload);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/documents/upload-url', canWrite, async (req, res, next) => {
  try {
    const fileName = String(req.body?.fileName || 'contrato.pdf');
    const data = await storageService.getUploadUrl(req.clinica.id, 'contract_document', req.params.id as string, fileName);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/documents/confirm', canWrite, async (req, res, next) => {
  try {
    const payload = docConfirmSchema.parse(req.body);
    const url = await storageService.confirmUpload(
      req.clinica.id,
      'contract_document',
      req.params.id as string,
      payload.path,
      payload.provider,
      payload.base64Data,
    );
    const data = await contractsService.addDocument(req.clinica.id, req.params.id as string, {
      nome: payload.nome,
      url,
      mimeType: payload.mimeType,
      tamanhoBytes: payload.tamanhoBytes,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
