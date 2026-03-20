import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { SeguroUpdateSchema } from '@clinicaplus/types';
import { requireRole } from '../middleware/requireRole';
import { Papel, EstadoSeguro } from '@clinicaplus/types';

export const pagamentosRouter = Router();

pagamentosRouter.patch('/:id/seguro', requireRole([Papel.ADMIN, Papel.RECEPCIONISTA]), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.user!.clinicaId;
    const pagamentoId = req.params.id;
    if (!pagamentoId) return;
    
    const data = SeguroUpdateSchema.parse(req.body);
    
    const seguro = await prisma.seguroPagamento.findUnique({
      where: { pagamentoId: pagamentoId as string },
      include: { pagamento: true }
    });
    
    if (!seguro || seguro.pagamento.clinicaId !== clinicaId) {
        throw new AppError('Pagamento com seguro não encontrado', 404);
    }
    
    const updated = await prisma.seguroPagamento.update({
        where: { pagamentoId: pagamentoId as string },
        data: {
            estado: data.estado as EstadoSeguro,
            valorAprovado: data.valorAprovado ?? null,
            numeroAutorizacao: data.numeroAutorizacao ?? null,
            notasSeguradora: data.notasSeguradora ?? null,
            dataResposta: new Date()
        }
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});
