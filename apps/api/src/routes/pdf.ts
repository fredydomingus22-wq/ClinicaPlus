import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantMiddleware } from '../middleware/tenant';
import { pdfService } from '../services/pdf.service';

const router = Router();

/**
 * GET /pdf/consulta/:agendamentoId
 * Gera PDF completo da consulta (anamnese + odontograma)
 */
router.get('/consulta/:agendamentoId', authenticate, tenantMiddleware, async (req, res, next) => {
  try {
    const { agendamentoId } = req.params;
    const clinicaId = req.user.clinicaId;
    
    if (!clinicaId) {
      throw new Error('ClinicaId não encontrado no token');
    }

    // @ts-expect-error - clinicaId is guaranteed to be string after null check, but TS strict mode doesn't infer correctly
    const pdfBuffer = await pdfService.generateConsultaReport(agendamentoId, clinicaId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="consulta-${agendamentoId}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /pdf/resumo/:agendamentoId
 * Gera PDF de resumo da consulta
 */
router.get('/resumo/:agendamentoId', authenticate, tenantMiddleware, async (req, res, next) => {
  try {
    const { agendamentoId } = req.params;
    const clinicaId = req.user.clinicaId;
    
    if (!clinicaId) {
      throw new Error('ClinicaId não encontrado no token');
    }

    // @ts-expect-error - clinicaId is guaranteed to be string after null check, but TS strict mode doesn't infer correctly
    const pdfBuffer = await pdfService.generateResumoReport(agendamentoId, clinicaId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="resumo-${agendamentoId}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
