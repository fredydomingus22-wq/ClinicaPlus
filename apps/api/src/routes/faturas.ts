import { Router, Request, Response } from 'express';
import { faturasService } from '../services/faturas.service';
import { FaturaCreateSchema, PagamentoCreateSchema, NotaDebitoCreateSchema } from '@clinicaplus/types';
import { z } from 'zod';
import { requirePermission } from '../middleware/requirePermission';
import { logger } from '../lib/logger';

export const faturasRouter = Router();

// Apenas utilizadores com permissão fatura:create podem criar faturas
faturasRouter.post('/', requirePermission('fatura', 'create'), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const utilizadorId = req.user!.id;
    
    const data = FaturaCreateSchema.parse(req.body);
    const fatura = await faturasService.create(data, clinicaId, utilizadorId);
    
    res.status(201).json({ success: true, data: fatura });
  } catch (err) { next(err); }
});

faturasRouter.get('/', requirePermission('fatura', 'read'), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const filters = req.query;
    
    const result = await faturasService.list(filters, clinicaId);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

faturasRouter.get('/:id', requirePermission('fatura', 'read'), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const faturaId = req.params.id;
    if (!faturaId) return; // Type guard
    
    const fatura = await faturasService.getOne(faturaId, clinicaId);
    res.json({ success: true, data: fatura });
  } catch (err) { next(err); }
});

faturasRouter.patch('/:id/emitir', requirePermission('fatura', 'create'), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const faturaId = req.params.id;
    if (!faturaId) return; // Type guard
    const utilizadorId = req.user!.id;
    
    const fatura = await faturasService.emitir(faturaId, clinicaId, utilizadorId);
    res.json({ success: true, data: fatura });
  } catch (err) { next(err); }
});

export const AnularSchema = z.object({
  motivo: z.string().min(1, 'Motivo da anulação é obrigatório')
});

faturasRouter.patch('/:id/anular', requirePermission('fatura', 'void'), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const faturaId = req.params.id;
    if (!faturaId) return;
    const utilizadorId = req.user!.id;
    
    const data = AnularSchema.parse(req.body);
    const fatura = await faturasService.criarNotaCredito(faturaId, clinicaId, data.motivo, utilizadorId);
    res.json({ success: true, data: fatura });
  } catch (err) { next(err); }
});

faturasRouter.post('/:id/nota-debito', requirePermission('fatura', 'create'), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const faturaId = req.params.id;
    if (!faturaId) return;
    const utilizadorId = req.user!.id;

    const data = NotaDebitoCreateSchema.parse(req.body);
    const fatura = await faturasService.criarNotaDebito(faturaId, clinicaId, data, utilizadorId);
    res.json({ success: true, data: fatura });
  } catch (err) { next(err); }
});

// Pagamentos associados a uma fatura
faturasRouter.post('/:id/pagamentos', requirePermission('pagamento', 'create'), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const faturaId = req.params.id;
    if (!faturaId) return;
    const utilizadorId = req.user!.id;
    
    const payload = { ...req.body, faturaId };
    const parsed = PagamentoCreateSchema.safeParse(payload);
    if (!parsed.success) {
      logger.warn(
        {
          clinicaId,
          utilizadorId,
          faturaId,
          body: req.body,
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          })),
        },
        'Validação falhou ao registar pagamento'
      );
      throw parsed.error;
    }
    
    const pagamento = await faturasService.registarPagamento(faturaId, parsed.data, clinicaId, utilizadorId);
    res.status(201).json({ success: true, data: pagamento });
  } catch (err) { next(err); }
});

// Ciclo de Seguro
faturasRouter.patch('/pagamentos/:pagamentoId/submeter-seguro', requirePermission('pagamento', 'create'), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const { pagamentoId } = req.params;
    await faturasService.submeterSeguro(pagamentoId!, clinicaId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

faturasRouter.patch('/pagamentos/:pagamentoId/registar-resposta-seguro', requirePermission('pagamento', 'create'), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const { pagamentoId } = req.params;
    const data = req.body; 
    await faturasService.registarRespostaSeguro(pagamentoId!, clinicaId, data);
    res.json({ success: true });
  } catch (err) { next(err); }
});
