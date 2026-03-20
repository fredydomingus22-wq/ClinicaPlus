import { Router } from 'express';
import { waInstanciaService } from '../services/wa-instancia.service';
import { waAutomacaoService } from '../services/wa-automacao.service';
import { waWebhookService } from '../services/wa-webhook.service';
import { waConversaService } from '../services/wa-conversa.service';
import { waActividadeService } from '../services/wa-actividade.service';
import { requirePlan } from '../middleware/requirePlan';
import { requirePermission } from '../middleware/requirePermission';
import { verificarHmacEvolution } from '../middleware/verificarHmacEvolution';
import { Plano } from '@prisma/client';
import { logger } from '../lib/logger';

const router = Router();


// --- GESTÃO DA INSTÂNCIA (ADMIN, Plano PRO+) ---

// Listar todas as instâncias da clínica
router.get('/instancias', 
  requirePlan(Plano.PRO),
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id!;
      const instancias = await waInstanciaService.listarPorClinica(clinicaId);
      return res.json(instancias);
    } catch (error) { return next(error); }
});

router.post('/instancias', 
  requirePlan(Plano.PRO), 
  requirePermission('whatsapp', 'manage'), 
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id as string;
      const instancia = await waInstanciaService.criar(clinicaId);
      return res.status(201).json(instancia);
    } catch (error) { return next(error); }
});

router.get('/instancias/:id/qrcode', 
  requirePlan(Plano.PRO), 
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id as string;
      const { id } = req.params;
      const qrcode = await waInstanciaService.obterQrCode(id as string, clinicaId as string);
      return res.json(qrcode);
    } catch (error) { return next(error); }
});

router.get('/instancias/:id/estado', 
  requirePlan(Plano.PRO), 
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id as string;
      const { id } = req.params;
      const instancia = await waInstanciaService.sincronizarEstado(id as string, clinicaId as string);
      
      if (!instancia) {
        return res.status(404).json({ message: 'Instância não encontrada' });
      }

      return res.json({ 
        estado: instancia.estado, 
        numeroTelefone: instancia.numeroTelefone,
        qrCodeBase64: instancia.qrCodeBase64 
      });
    } catch (error) { return next(error); }
});

router.delete('/instancias/:id', 
  requirePlan(Plano.PRO), 
  requirePermission('whatsapp', 'manage'), 
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id as string;
      const { id } = req.params;
      await waInstanciaService.eliminar(id as string, clinicaId as string);
      return res.json({ success: true });
    } catch (error) { return next(error); }
});

// --- GESTÃO DE AUTOMAÇÕES (ADMIN, Plano PRO+) ---
router.get('/automacoes', 
  requirePlan(Plano.PRO), 
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id as string;
      const { instanciaId } = req.query;
      const automacoes = await waAutomacaoService.listar(clinicaId as string, instanciaId as string);
      return res.json(automacoes);
    } catch (error) { return next(error); }
});

router.get('/templates', 
  requirePlan(Plano.PRO), 
  async (_req, res, next) => {
    try {
      const templates = await waAutomacaoService.obterTemplates();
      return res.json(templates);
    } catch (error) { return next(error); }
});

router.post('/automacoes', 
  requirePlan(Plano.PRO), 
  requirePermission('whatsapp', 'manage'), 
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id as string;
      const { tipo, waInstanciaId } = req.body;
      
      if (!waInstanciaId) {
        return res.status(400).json({ message: 'waInstanciaId é obrigatório' });
      }

      const automacao = await waAutomacaoService.adicionar(clinicaId, tipo, waInstanciaId);
      return res.status(201).json(automacao);
    } catch (error) { return next(error); }
});

router.patch('/automacoes/:id', 
  requirePlan(Plano.PRO), 
  requirePermission('whatsapp', 'manage'), 
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id as string;
      const { id } = req.params;
      const automacao = await waAutomacaoService.configurar(id as string, req.body, clinicaId);
      return res.json(automacao);
    } catch (error) { return next(error); }
});

router.post('/automacoes/:id/activar', 
  requirePlan(Plano.PRO), 
  requirePermission('whatsapp', 'manage'), 
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id as string;
      const userId = req.user!.id;
      const { id } = req.params;
      await waAutomacaoService.activar(id as string, clinicaId as string, userId as string);
      return res.json({ success: true });
    } catch (error) { return next(error); }
});

router.post('/automacoes/:id/desactivar', 
  requirePlan(Plano.PRO), 
  requirePermission('whatsapp', 'manage'), 
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id as string;
      const userId = req.user!.id;
      const { id } = req.params;
      await waAutomacaoService.desactivar(id as string, clinicaId as string, userId as string);
      return res.json({ success: true });
    } catch (error) { return next(error); }
});

// --- WEBHOOK DA EVOLUTION API (HMAC) ---
router.post('/webhook', verificarHmacEvolution, async (req, res) => {
  try {
    await waWebhookService.processarEvento(req.body);
    res.status(200).send('OK');
  } catch (err: unknown) {
    logger.error({ err }, 'Erro no processamento do webhook do WhatsApp');
    res.status(200).send('Error logged'); 
  }
});

// --- ACTIVIDADE E RELATÓRIOS (ADMIN) ---
router.get('/actividade', 
  requirePlan(Plano.PRO),
  async (req, res, next) => {
  try {
      const clinicaId = req.clinica.id as string;
    const actividade = await waActividadeService.listarRecente(clinicaId as string);
    return res.json(actividade);
  } catch (error) { return next(error); }
});

router.get('/metricas', 
  requirePlan(Plano.PRO),
  async (req, res, next) => {
  try {
      const clinicaId = req.clinica.id as string;
    const metricas = await waActividadeService.obterMetricas(clinicaId as string);
    return res.json(metricas);
  } catch (error) { return next(error); }
});

router.get('/conversas', async (req, res, next) => {
  try {
      const clinicaId = req.clinica.id as string;
      const conversas = await waConversaService.listarActivas(clinicaId);
      return res.json(conversas);
    } catch (error) { return next(error); }
});

export default router;
