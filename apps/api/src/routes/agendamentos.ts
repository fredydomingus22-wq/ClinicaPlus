import { Router } from 'express';
import {
  AgendamentoCreateSchema,
  AgendamentoUpdateEstadoSchema,
  AgendamentoTriagemSchema,
  AgendamentoConsultaSchema,
  AgendamentoListQuerySchema,
  Papel,
  ConsultaInput
} from '@clinicaplus/types';
import { agendamentosService } from '../services/agendamentos.service';
import { requireRole } from '../middleware/requireRole';
import { prisma } from '../lib/prisma';
import { bookingRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /agendamentos
 * Auth: ADMIN, MEDICO, RECEPCIONISTA
 */
router.get('/',
  requireRole([Papel.ADMIN, Papel.MEDICO, Papel.RECEPCIONISTA]),
  async (req, res, next) => {
    try {
      const query = AgendamentoListQuerySchema.parse(req.query);
      
      // Security: If user is a medico, force filter by their medico profile
      if (req.user.papel === Papel.MEDICO) {
        const medico = await prisma.medico.findUnique({
          where: { utilizadorId: req.user.id }
        });
        if (medico) {
          query.medicoId = medico.id;
        }
      }

      const result = await agendamentosService.list(req.clinica.id, query);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

/**
 * GET /agendamentos/hoje
 * Auth: ADMIN, MEDICO, RECEPCIONISTA
 */
router.get('/hoje',
  requireRole([Papel.ADMIN, Papel.MEDICO, Papel.RECEPCIONISTA]),
  async (req, res, next) => {
    try {
      const medicoId = req.query.medicoId as string | undefined;
      const result = await agendamentosService.getHoje(req.clinica.id, medicoId);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

/**
 * GET /agendamentos/meus
 * Auth: PACIENTE
 */
router.get('/meus',
  requireRole([Papel.PACIENTE]),
  async (req, res, next) => {
    try {
      const query = AgendamentoListQuerySchema.parse(req.query);
      const result = await agendamentosService.getMeus(req.user.id, req.clinica.id, query);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

/**
 * GET /agendamentos/:id
 * Auth: All roles (PACIENTE verified for ownership)
 */
router.get('/:id',
  requireRole([Papel.ADMIN, Papel.MEDICO, Papel.RECEPCIONISTA, Papel.PACIENTE]),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const agendamento = await agendamentosService.getOne(id, req.clinica.id);

      // If user is a patient, they can only see their own appointments
      if (req.user.papel === Papel.PACIENTE) {
        const paciente = await prisma.paciente.findUnique({
          where: { utilizadorId: req.user.id }
        });

        if (!paciente || agendamento.pacienteId !== paciente.id) {
          return res.status(404).json({
            success: false,
            error: { message: 'Agendamento não encontrado', code: 'NOT_FOUND' },
          });
        }
      }

      // If user is a medico, ensure the appointment is assigned to them (or they are admin)
      if (req.user.papel === Papel.MEDICO) {
        const medico = await prisma.medico.findUnique({
          where: { utilizadorId: req.user.id }
        });
        if (medico && agendamento.medicoId !== medico.id) {
          // Medico can only see their own appointments unless they have higher permission (Admin check is already in requireRole but this handles medico explicitly)
          return res.status(403).json({
            success: false,
            error: { message: 'Acesso negado a este agendamento', code: 'FORBIDDEN' },
          });
        }
      }

    return res.json({ success: true, data: agendamento });
  } catch (err) { return next(err); }
});

/**
 * POST /agendamentos
 * Auth: ADMIN, RECEPCIONISTA, PACIENTE
 */
router.post('/',
  bookingRateLimiter,
  requireRole([Papel.ADMIN, Papel.RECEPCIONISTA, Papel.PACIENTE]),
  async (req, res, next) => {
    try {
      const body = AgendamentoCreateSchema.parse(req.body);
      
      // If patient is creating, force the pacienteId to their own
      if (req.user.papel === Papel.PACIENTE) {
        const paciente = await prisma.paciente.findUnique({
          where: { utilizadorId: req.user.id }
        });

        if (!paciente || paciente.clinicaId !== req.clinica.id) {
          return res.status(404).json({
            success: false,
            error: { message: 'Perfil de paciente não encontrado', code: 'PATIENT_NOT_FOUND' },
          });
        }
        body.pacienteId = paciente.id;
      }

      const agendamento = await agendamentosService.create(body, req.clinica.id);
      return res.status(201).json({ success: true, data: agendamento });
    } catch (err) { return next(err); }
  }
);

/**
 * PATCH /agendamentos/:id/estado
 * Auth: ADMIN, MEDICO, RECEPCIONISTA (PACIENTE: CANCELADO only)
 */
router.patch('/:id/estado', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const body = AgendamentoUpdateEstadoSchema.parse(req.body);

    if (req.user.papel === Papel.PACIENTE) {
      if (body.estado !== 'CANCELADO') {
        return res.status(403).json({
          success: false,
          error: { message: 'Apenas cancelamentos são permitidos', code: 'FORBIDDEN' },
        });
      }

      // Check ownership: find the patient linked to this user and verify this appointment belongs to them
      const agendamento = await agendamentosService.getOne(id, req.clinica.id);
      const paciente = await prisma.paciente.findFirst({
        where: { utilizadorId: req.user.id, clinicaId: req.clinica.id },
      });

      if (!paciente || agendamento.pacienteId !== paciente.id) {
        return res.status(404).json({
          success: false,
          error: { message: 'Agendamento não encontrado', code: 'NOT_FOUND' },
        });
      }
    }

    const updated = await agendamentosService.updateEstado(
      id,
      req.clinica.id,
      body,
      req.user.id
    );
    return res.json({ success: true, data: updated });
  } catch (err) { return next(err); }
});

/**
 * PATCH /agendamentos/:id/triagem
 * Auth: RECEPCIONISTA
 */
router.patch('/:id/triagem',
  requireRole([Papel.ADMIN, Papel.RECEPCIONISTA]),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const body = AgendamentoTriagemSchema.parse(req.body);
      const updated = await agendamentosService.registarTriagem(id, req.clinica.id, body);
      return res.json({ success: true, data: updated });
    } catch (err) { return next(err); }
  }
);

/**
 * PATCH /agendamentos/:id/consulta
 * Auth: MEDICO
 */
router.patch('/:id/consulta',
  requireRole([Papel.ADMIN, Papel.MEDICO]),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const body = AgendamentoConsultaSchema.parse(req.body);
      // Explicitly preserve finalizar flag from raw body in case Zod strips it from stale types
      const dataWithFlag = { ...body, finalizar: req.body.finalizar === true };
      const updated = await agendamentosService.registarConsulta(id, req.clinica.id, dataWithFlag as ConsultaInput);
      return res.json({ success: true, data: updated });
    } catch (err) { return next(err); }
  }
);

export default router;
