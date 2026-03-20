import { Router } from 'express';
import { apiKeysService } from '../services/apikeys.service';
import { ApiKeyCreateSchema } from '@clinicaplus/types';
import { AppError } from '../lib/AppError';
import { requirePlan } from '../middleware/requirePlan';

const router = Router();

// Todas as rotas de API Keys requerem plano PRO
router.use(requirePlan('PRO'));

/**
 * GET /api/api-keys
 * Lista as chaves da clínica.
 */
router.get('/', async (req, res, next) => {
  try {
    const keys = await apiKeysService.list(req.clinica.id);
    res.json({ success: true, data: keys });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/api-keys
 * Cria uma nova chave.
 */
router.post('/', async (req, res, next) => {
  try {
    const validated = ApiKeyCreateSchema.safeParse(req.body);
    if (!validated.success) {
      throw new AppError('Dados inválidos', 400, 'VALIDATION_ERROR');
    }

    const apiKey = await apiKeysService.create(validated.data, req.clinica.id, req.user.id);
    res.status(201).json({ success: true, data: apiKey });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/api-keys/:id
 * Revoga uma chave.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await apiKeysService.revoke(req.params.id, req.clinica.id, req.user.id);
    res.json({ success: true, message: 'API Key revogada com sucesso' });
  } catch (err) {
    next(err);
  }
});

export default router;
