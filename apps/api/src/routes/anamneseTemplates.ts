// src/routes/anamneseTemplates.ts
import express, { Request, Response, NextFunction } from 'express';
import { anamneseTemplateService } from '../services/anamneseTemplate.service';
import { withRoleGuard } from '../middleware/roleGuard';
import { AppError } from '../lib/AppError';

const router = express.Router();
type AuthUser = { papel?: string };

// Middleware to extract clinicaId from request (already set by auth middleware)
const withClinica = (req: Request, res: Response, next: NextFunction) => {
  if (!req.clinica?.id) {
    return next(new AppError('Clinica não informada', 400));
  }
  next();
};
router.use(withClinica);
router.use(withRoleGuard); // Apply role‑based guard to all subsequent routes

// GET template by specialty ID
router.get('/especialidade/:especialidadeId', async (req: Request, res: Response, next: NextFunction) => {
  const { especialidadeId } = req.params;
  if (!especialidadeId) return next(new AppError('especialidadeId é obrigatório', 400));
  try {
    const template = await anamneseTemplateService.getByEspecialidade(req.clinica!.id, especialidadeId);
    res.json(template);
  } catch (err) {
    next(err);
  }
});

// POST create new template for a specialty
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const { especialidadeId, titulo, questoes } = req.body;
  // Only ADMIN can create templates
  const user = (req as Request & { user?: AuthUser }).user;
  if (user.papel !== 'ADMIN') {
    return next(new AppError('Acesso negado: apenas administradores podem criar templates', 403));
  }
  try {
    const created = await anamneseTemplateService.create(req.clinica!.id, especialidadeId, titulo, questoes);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PATCH update template questions
router.patch('/:templateId', async (req: Request, res: Response, next: NextFunction) => {
  const { templateId } = req.params;
  if (!templateId) return next(new AppError('templateId é obrigatório', 400));
  const { questoes } = req.body;
  const user = (req as Request & { user?: AuthUser }).user;
  if (user.papel !== 'ADMIN') {
    return next(new AppError('Acesso negado: apenas administradores podem atualizar templates', 403));
  }
  try {
    const updated = await anamneseTemplateService.update(req.clinica!.id, templateId, questoes);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE template
router.delete('/:templateId', async (req: Request, res: Response, next: NextFunction) => {
  const { templateId } = req.params;
  if (!templateId) return next(new AppError('templateId é obrigatório', 400));
  const user = (req as Request & { user?: AuthUser }).user;
  if (user.papel !== 'ADMIN') {
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
