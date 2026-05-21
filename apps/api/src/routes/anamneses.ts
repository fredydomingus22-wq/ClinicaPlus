import { Router, Request, Response } from 'express';
import { AnamneseService } from '../services/anamneses.service';
import { AnamneseCreateSchema, AnamneseUpdateSchema, ANAMNESE_TEMPLATES, Especialidade } from '@clinicaplus/types';
import { AppError } from '../lib/AppError';

const router = Router();

/**
 * GET /api/anamneses/templates/:especialidade
 * Retorna as perguntas do template para uma especialidade.
 */
router.get('/templates/:especialidade', (req: Request, res: Response) => {
  const { especialidade } = req.params;
  const template = ANAMNESE_TEMPLATES[especialidade as Especialidade];

  if (!template) {
    throw new AppError('Template não encontrado para esta especialidade', 404);
  }

  res.json(template);
});

/**
 * GET /api/anamneses/agendamento/:agendamentoId
 * Busca a anamnese de um agendamento específico.
 */
router.get('/agendamento/:agendamentoId', async (req: Request, res: Response) => {
  const { agendamentoId } = req.params;
  const clinicaId = req.clinica.id;

  const anamnese = await AnamneseService.getByAgendamento(clinicaId as string, agendamentoId as string);
  res.json(anamnese);
});

/**
 * GET /api/anamneses/paciente/:pacienteId
 * Busca o histórico de anamneses de um paciente.
 */
router.get('/paciente/:pacienteId', async (req: Request, res: Response) => {
  const { pacienteId } = req.params;
  const clinicaId = req.clinica.id;

  const anamneses = await AnamneseService.getByPaciente(clinicaId as string, pacienteId as string);
  res.json(anamneses);
});

/**
 * GET /api/anamneses/:id
 * Busca uma anamnese específica por ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const clinicaId = req.clinica.id;

  const anamnese = await AnamneseService.getById(clinicaId as string, id as string);
  res.json(anamnese);
});

/**
 * POST /api/anamneses
 * Cria uma nova anamnese.
 */
router.post('/', async (req: Request, res: Response) => {
  const clinicaId = req.clinica.id;
  
  const validated = AnamneseCreateSchema.parse(req.body);
  const anamnese = await AnamneseService.create(clinicaId as string, validated);
  
  res.status(201).json(anamnese);
});

/**
 * PATCH /api/anamneses/:id
 * Atualiza as respostas de uma anamnese.
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const clinicaId = req.clinica.id;

  const validated = AnamneseUpdateSchema.parse(req.body);
  const anamnese = await AnamneseService.update(clinicaId as string, id as string, validated);

  res.json(anamnese);
});

export default router;
