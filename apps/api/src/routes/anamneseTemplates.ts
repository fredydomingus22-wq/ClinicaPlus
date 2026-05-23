import express, { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/AppError';
import { withRoleGuard } from '../middleware/roleGuard';
import { anamneseTemplateService } from '../services/anamneseTemplate.service';

const router = express.Router();
type AuthUser = { papel?: string };

const questaoSchema = z.object({
  id: z.string().uuid().optional(),
  ordem: z.number().int().positive(),
  pergunta: z.string().trim().min(1, 'Pergunta e obrigatoria'),
  tipoResposta: z.enum(['text', 'boolean', 'date', 'select']),
  options: z
    .array(
      z.object({
        valor: z.string().trim().min(1),
        label: z.string().trim().min(1),
      }),
    )
    .optional(),
});

const createTemplateSchema = z.object({
  especialidadeId: z.string().uuid('especialidadeId invalido'),
  titulo: z.string().trim().min(1, 'Titulo e obrigatorio'),
  questoes: z.array(questaoSchema).min(1, 'Pelo menos uma questao e obrigatoria'),
});

const updateTemplateSchema = z.object({
  titulo: z.string().trim().min(1).optional(),
  questoes: z.array(questaoSchema).min(1).optional(),
});

const withClinica = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.clinica?.id) return next(new AppError('Clinica nao informada', 400));
  next();
};

router.use(withClinica);
router.use(withRoleGuard);

router.get('/especialidade/:especialidadeId', async (req: Request, res: Response, next: NextFunction) => {
  const { especialidadeId } = req.params;
  if (!especialidadeId) return next(new AppError('especialidadeId e obrigatorio', 400));
  try {
    const template = await anamneseTemplateService.getByEspecialidade(req.clinica!.id, especialidadeId);
    res.json(template);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as Request & { user?: AuthUser }).user;
  if (user?.papel !== 'ADMIN') {
    return next(new AppError('Acesso negado: apenas administradores podem criar templates', 403));
  }

  const parsed = createTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(`Payload invalido: ${parsed.error.issues[0]?.message ?? 'dados invalidos'}`, 400));
  }

  try {
    const { especialidadeId, titulo, questoes } = parsed.data;
    const created = await anamneseTemplateService.create(req.clinica!.id, especialidadeId, titulo, questoes);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.patch('/:templateId', async (req: Request, res: Response, next: NextFunction) => {
  const { templateId } = req.params;
  if (!templateId) return next(new AppError('templateId e obrigatorio', 400));

  const user = (req as Request & { user?: AuthUser }).user;
  if (user?.papel !== 'ADMIN') {
    return next(new AppError('Acesso negado: apenas administradores podem atualizar templates', 403));
  }

  const parsed = updateTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(`Payload invalido: ${parsed.error.issues[0]?.message ?? 'dados invalidos'}`, 400));
  }
  if (!parsed.data.questoes) return next(new AppError('questoes e obrigatorio para atualizacao', 400));

  try {
    const updated = await anamneseTemplateService.update(req.clinica!.id, templateId, parsed.data.questoes);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:templateId', async (req: Request, res: Response, next: NextFunction) => {
  const { templateId } = req.params;
  if (!templateId) return next(new AppError('templateId e obrigatorio', 400));
  const user = (req as Request & { user?: AuthUser }).user;
  if (user?.papel !== 'ADMIN') {
    return next(new AppError('Acesso negado: apenas administradores podem remover templates', 403));
  }
  try {
    await anamneseTemplateService.delete(req.clinica!.id, templateId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
