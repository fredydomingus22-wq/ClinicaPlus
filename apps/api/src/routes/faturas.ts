import { Router, Request, Response } from 'express';
import { faturasService } from '../services/faturas.service';
import { FaturaCreateSchema, PagamentoCreateSchema } from '@clinicaplus/types';
import { z } from 'zod';
import { requireRole } from '../middleware/requireRole';
import { Papel } from '@clinicaplus/types';

export const faturasRouter = Router();

// Apenas ADMIN e RECEPCIONISTA podem criar faturas (conforme spec)
faturasRouter.post('/', requireRole([Papel.ADMIN, Papel.RECEPCIONISTA]), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const utilizadorId = req.user!.id;
    
    const data = FaturaCreateSchema.parse(req.body);
    const fatura = await faturasService.create(data, clinicaId, utilizadorId);
    
    res.status(201).json({ success: true, data: fatura });
  } catch (err) { next(err); }
});

faturasRouter.get('/', async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const filters = req.query;
    
    const result = await faturasService.list(filters, clinicaId);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

faturasRouter.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const faturaId = req.params.id;
    if (!faturaId) return; // Type guard
    
    const fatura = await faturasService.getOne(faturaId, clinicaId);
    res.json({ success: true, data: fatura });
  } catch (err) { next(err); }
});

faturasRouter.patch('/:id/emitir', async (req: Request, res: Response, next) => {
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

faturasRouter.patch('/:id/anular', requireRole([Papel.ADMIN, Papel.RECEPCIONISTA]), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const faturaId = req.params.id;
    if (!faturaId) return;
    const utilizadorId = req.user!.id;
    
    const data = AnularSchema.parse(req.body);
    const fatura = await faturasService.anular(faturaId, clinicaId, data.motivo, utilizadorId);
    res.json({ success: true, data: fatura });
  } catch (err) { next(err); }
});

// Pagamentos associados a uma fatura
faturasRouter.post('/:id/pagamentos', requireRole([Papel.ADMIN, Papel.RECEPCIONISTA]), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const faturaId = req.params.id;
    if (!faturaId) return;
    const utilizadorId = req.user!.id;
    
    const payload = { ...req.body, faturaId };
    const data = PagamentoCreateSchema.parse(payload);
    
    const pagamento = await faturasService.registarPagamento(faturaId, data, clinicaId, utilizadorId);
    res.status(201).json({ success: true, data: pagamento });
  } catch (err) { next(err); }
});

// Ciclo de Seguro
faturasRouter.patch('/pagamentos/:pagamentoId/submeter-seguro', requireRole([Papel.ADMIN, Papel.RECEPCIONISTA]), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const { pagamentoId } = req.params;
    await faturasService.submeterSeguro(pagamentoId!, clinicaId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

faturasRouter.patch('/pagamentos/:pagamentoId/registar-resposta-seguro', requireRole([Papel.ADMIN, Papel.RECEPCIONISTA]), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.clinica.id;
    const { pagamentoId } = req.params;
    const data = req.body; // Ideally use a schema here
    await faturasService.registarRespostaSeguro(pagamentoId!, clinicaId, data);
    res.json({ success: true });
  } catch (err) { next(err); }
});
