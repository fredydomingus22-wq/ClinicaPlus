import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/requireRole';
import { Papel, EstadoSeguro } from '@clinicaplus/types';

export const segurosRouter = Router();

// List Seguros (with filters)
segurosRouter.get('/', requireRole([Papel.ADMIN, Papel.RECEPCIONISTA, Papel.MEDICO]), async (req: Request, res: Response, next) => {
  try {
    const clinicaId = req.user!.clinicaId;
    const { estado, seguradora, pacienteId, page = '1', limit = '10' } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {
      pagamento: {
        clinicaId
      }
    };

    if (estado) where.estado = estado as EstadoSeguro;
    if (seguradora) where.seguradora = seguradora as string;
    
    // If filtering by paciente, we need to go through pagamento -> fatura -> paciente
    if (pacienteId) {
      where.pagamento = {
        ...where.pagamento,
        fatura: {
          pacienteId: pacienteId as string
        }
      };
    }

    const [total, seguros] = await Promise.all([
      prisma.seguroPagamento.count({ where }),
      prisma.seguroPagamento.findMany({
        where,
        skip,
        take,
        orderBy: { dataSubmissao: 'desc' }, // or criadoEm if it existed, but we have to order by something logical. Let's order by pagamento.criadoEm
        include: {
          pagamento: {
            include: {
              fatura: {
                include: {
                  paciente: {
                    select: { id: true, nome: true, numeroPaciente: true, nif: true }
                  }
                }
              }
            }
          }
        }
      })
    ]);

    // Format for frontend
    const items = seguros.map(s => ({
      id: s.id,
      pagamentoId: s.pagamentoId,
      seguradora: s.seguradora,
      numeroBeneficiario: s.numeroBeneficiario,
      numeroAutorizacao: s.numeroAutorizacao,
      valorSolicitado: s.valorSolicitado,
      valorAprovado: s.valorAprovado,
      estado: s.estado,
      dataSubmissao: s.dataSubmissao?.toISOString(),
      dataResposta: s.dataResposta?.toISOString(),
      notasSeguradora: s.notasSeguradora,
      pagamento: {
        id: s.pagamento.id,
        valor: s.pagamento.valor,
        criadoEm: s.pagamento.criadoEm.toISOString(),
        fatura: {
          id: s.pagamento.fatura.id,
          numeroFatura: s.pagamento.fatura.numeroFatura,
          estado: s.pagamento.fatura.estado,
          paciente: s.pagamento.fatura.paciente
        }
      }
    }));

    res.json({
      items,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err) { next(err); }
});

// Update Seguro Status (re-using the logic, or we can just call this endpoint directly)
segurosRouter.patch('/:pagamentoId/status', requireRole([Papel.ADMIN, Papel.RECEPCIONISTA, Papel.MEDICO]), async (req: Request, res: Response, next): Promise<void> => {
  try {
    const clinicaId = req.user!.clinicaId;
    const pagamentoId = req.params.pagamentoId as string;
    const { estado, valorAprovado, numeroAutorizacao, notasSeguradora } = req.body;

    const seguro = await prisma.seguroPagamento.findUnique({
      where: { pagamentoId },
      include: { pagamento: true }
    });

    if (!seguro || seguro.pagamento.clinicaId !== clinicaId) {
      res.status(404).json({ error: 'Seguro não encontrado' });
      return;
    }

    const updated = await prisma.seguroPagamento.update({
      where: { pagamentoId },
      data: {
        estado,
        valorAprovado: valorAprovado ?? null,
        numeroAutorizacao: numeroAutorizacao ?? null,
        notasSeguradora: notasSeguradora ?? null,
        // If moving to SUBMETIDO, record submissao
        ...(estado === 'SUBMETIDO' && !seguro.dataSubmissao ? { dataSubmissao: new Date() } : {}),
        // If moving to final states, record resposta
        ...(['APROVADO', 'PARCIAL', 'GLOSADO', 'CANCELADO', 'PAGO'].includes(estado) ? { dataResposta: new Date() } : {})
      }
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});
