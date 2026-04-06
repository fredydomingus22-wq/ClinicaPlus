import { Router } from 'express';
import { tratamentosConfigService } from '../services/config-tratamentos.service';
import { requireRole } from '../middleware/requireRole';
import { CriarTipoExameClinicaSchema, CriarTipoTratamentoSchema } from '@clinicaplus/types';

const router = Router();

// --- TIPOS DE EXAMES ---
router.get('/tipos-exames', async (req, res, next) => {
  try {
    const records = await tratamentosConfigService.listTiposExame(req.clinica!.id);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

router.post('/tipos-exames', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const data = CriarTipoExameClinicaSchema.parse(req.body);
    const record = await tratamentosConfigService.createTipoExame(req.clinica!.id, data);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

// --- TIPOS DE TRATAMENTO ---
router.get('/tipos-tratamento', async (req, res, next) => {
  try {
    const records = await tratamentosConfigService.listTiposTratamento(req.clinica!.id);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

router.post('/tipos-tratamento', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const data = CriarTipoTratamentoSchema.parse(req.body);
    const record = await tratamentosConfigService.createTipoTratamento(req.clinica!.id, data);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
