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
import { authenticate } from '../middleware/authenticate';
import { tenantMiddleware } from '../middleware/tenant';
import { apiKeyAuth, requireScope } from '../middleware/apiKeyAuth';
import { prisma } from '../lib/prisma';
import { evolutionApi } from '../lib/evolutionApi';

const router = Router();


// --- GESTÃO DA INSTÂNCIA (ADMIN, Plano PRO+) ---

// Listar todas as instâncias da clínica
router.get('/instancias', 
  authenticate,
  tenantMiddleware,
  requirePlan(Plano.PRO),
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id!;
      const instancias = await waInstanciaService.listarPorClinica(clinicaId);
      return res.json(instancias);
    } catch (error) { return next(error); }
});

router.post('/instancias', 
  authenticate,
  tenantMiddleware,
  requirePlan(Plano.PRO), 
  requirePermission('whatsapp', 'manage'), 
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id as string;
      const userId = req.user!.id;
      const instancia = await waInstanciaService.criar(clinicaId, userId);
      return res.status(201).json(instancia);
    } catch (error) { return next(error); }
});

router.get('/instancias/:id/qrcode', 
  authenticate,
  tenantMiddleware,
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
  authenticate,
  tenantMiddleware,
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
  authenticate,
  tenantMiddleware,
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
  authenticate,
  tenantMiddleware,
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
  authenticate,
  tenantMiddleware,
  requirePlan(Plano.PRO), 
  async (_req, res, next) => {
    try {
      const templates = await waAutomacaoService.obterTemplates();
      return res.json(templates);
    } catch (error) { return next(error); }
});

router.post('/automacoes', 
  authenticate,
  tenantMiddleware,
  requirePlan(Plano.PRO), 
  requirePermission('whatsapp', 'manage'), 
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id as string;
      const { tipo, instanciaId, waInstanciaId } = req.body;
      const resolvedInstanciaId = instanciaId || waInstanciaId;
      
      if (!resolvedInstanciaId) {
        return res.status(400).json({ message: 'instanciaId é obrigatório' });
      }

      const automacao = await waAutomacaoService.adicionar(clinicaId, tipo, resolvedInstanciaId);
      return res.status(201).json(automacao);
    } catch (error) { return next(error); }
});

router.patch('/automacoes/:id', 
  authenticate,
  tenantMiddleware,
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
  authenticate,
  tenantMiddleware,
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
  authenticate,
  tenantMiddleware,
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
    const { event, instance, data } = req.body;
    await waWebhookService.handle(instance, event, data);
    res.status(200).send('OK');
  } catch (err: unknown) {
    logger.error({ err }, 'Erro no processamento do webhook do WhatsApp');
    res.status(200).send('Error logged'); 
  }
});

// --- ACTIVIDADE E RELATÓRIOS (ADMIN) ---
router.get('/actividade', 
  authenticate,
  tenantMiddleware,
  requirePlan(Plano.PRO),
  async (req, res, next) => {
  try {
      const clinicaId = req.clinica.id as string;
    const actividade = await waActividadeService.listarRecente(clinicaId as string);
    return res.json(actividade);
  } catch (error) { return next(error); }
});

router.get('/metricas', 
  authenticate,
  tenantMiddleware,
  requirePlan(Plano.PRO),
  async (req, res, next) => {
  try {
      const clinicaId = req.clinica.id as string;
    const metricas = await waActividadeService.obterMetricas(clinicaId as string);
    return res.json(metricas);
  } catch (error) { return next(error); }
});

router.get('/conversas', authenticate, tenantMiddleware, async (req, res, next) => {
  try {
      const clinicaId = req.clinica.id as string;
      const conversas = await waConversaService.listarActivas(clinicaId);
      return res.json(conversas);
    } catch (error) { return next(error); }
});

// --- ENDPOINTS PARA O n8n (FLUXOS) ---

// Obter conversa (GET /fluxo/conversa?numero=244...) — usado pelos templates n8n
router.get('/fluxo/conversa',
  apiKeyAuth,
  requireScope('READ_AGENDAMENTOS'),
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id;
      const { numero } = req.query;
      if (!numero) return res.status(400).json({ message: 'numero é obrigatório' });
      const conversa = await waConversaService.obterConversa(numero as string, clinicaId);
      return res.json({ data: conversa });
    } catch (error) { return next(error); }
});

// Iniciar fluxo (chamado pelo n8n ao receber mensagem)
router.post('/fluxo/inicio', 
  apiKeyAuth, 
  requireScope('WRITE_AGENDAMENTOS'),
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id;
      const { numero } = req.body;
      const instancia = await prisma.waInstancia.findUniqueOrThrow({ where: { clinicaId } });
      await waConversaService.etapaInicio(numero, clinicaId, instancia.evolutionName);
      return res.json({ success: true });
    } catch (error) { return next(error); }
});

// Processar resposta genérica (router interno)
router.post('/fluxo/resposta', 
  apiKeyAuth, 
  requireScope('WRITE_AGENDAMENTOS'),
  async (req, res, next) => {
    try {
      const clinicaId = req.clinica.id;
      const { numero, resposta, instanceName } = req.body;
      await waConversaService.processarResposta(numero, clinicaId, instanceName, resposta);
      return res.json({ success: true });
    } catch (error) { return next(error); }
});

// Endpoints por etapa — chamados directamente pelos templates n8n (MODULE-whatsapp.md §8)
router.post('/fluxo/especialidade', apiKeyAuth, requireScope('WRITE_AGENDAMENTOS'), async (req, res, next) => {
  try {
    const clinicaId = req.clinica.id;
    const { numero, resposta, instanceName } = req.body;
    const instancia = await prisma.waInstancia.findUniqueOrThrow({ where: { clinicaId } });
    await waConversaService.processarResposta(numero, clinicaId, instanceName || instancia.evolutionName, resposta);
    return res.json({ success: true });
  } catch (error) { return next(error); }
});

router.post('/fluxo/medico', apiKeyAuth, requireScope('WRITE_AGENDAMENTOS'), async (req, res, next) => {
  try {
    const clinicaId = req.clinica.id;
    const { numero, resposta, instanceName } = req.body;
    const instancia = await prisma.waInstancia.findUniqueOrThrow({ where: { clinicaId } });
    await waConversaService.processarResposta(numero, clinicaId, instanceName || instancia.evolutionName, resposta);
    return res.json({ success: true });
  } catch (error) { return next(error); }
});

router.post('/fluxo/horario', apiKeyAuth, requireScope('WRITE_AGENDAMENTOS'), async (req, res, next) => {
  try {
    const clinicaId = req.clinica.id;
    const { numero, resposta, instanceName } = req.body;
    const instancia = await prisma.waInstancia.findUniqueOrThrow({ where: { clinicaId } });
    await waConversaService.processarResposta(numero, clinicaId, instanceName || instancia.evolutionName, resposta);
    return res.json({ success: true });
  } catch (error) { return next(error); }
});

router.post('/fluxo/confirmar', apiKeyAuth, requireScope('WRITE_AGENDAMENTOS'), async (req, res, next) => {
  try {
    const clinicaId = req.clinica.id;
    const { numero, resposta, instanceName } = req.body;
    const instancia = await prisma.waInstancia.findUniqueOrThrow({ where: { clinicaId } });
    await waConversaService.processarResposta(numero, clinicaId, instanceName || instancia.evolutionName, resposta);
    return res.json({ success: true });
  } catch (error) { return next(error); }
});

// Enviar lembrete — chamado pelo job BullMQ via n8n
router.post('/fluxo/enviar-lembrete', apiKeyAuth, requireScope('WRITE_AGENDAMENTOS'), async (req, res, next) => {
  try {
    const clinicaId = req.clinica.id;
    const { agendamentoId, instanceName, template } = req.body;
    // Buscar agendamento e enviar lembrete via Evolution API
    const agendamento = await prisma.agendamento.findFirstOrThrow({
      where: { id: agendamentoId, clinicaId },
      include: { paciente: true, medico: true }
    });
    const instancia = await prisma.waInstancia.findUniqueOrThrow({ where: { clinicaId } });
    const telefone = agendamento.paciente.telefone?.replace('+', '') ?? '';
    if (!telefone) return res.status(400).json({ message: 'Paciente sem telefone' });

    const { format } = await import('date-fns');
    const { pt } = await import('date-fns/locale');
    const texto = (template as string || 'Olá {nome}! Lembrete da consulta {data} às {hora}.')
      .replace('{nome}', agendamento.paciente.nome)
      .replace('{data}', format(agendamento.dataHora, "d 'de' MMMM", { locale: pt }))
      .replace('{hora}', format(agendamento.dataHora, 'HH:mm'))
      .replace('{medico}', agendamento.medico.nome)
      .replace('{clinica}', '');
    await evolutionApi.enviarTexto(instanceName || instancia.evolutionName, telefone, texto);
    return res.json({ success: true });
  } catch (error) { return next(error); }
});

// Boas-vindas — número novo sem conversa prévia
router.post('/fluxo/boas-vindas', apiKeyAuth, requireScope('WRITE_AGENDAMENTOS'), async (req, res, next) => {
  try {
    const clinicaId = req.clinica.id;
    const { numero, instanceName, mensagem } = req.body;
    const instancia = await prisma.waInstancia.findUniqueOrThrow({ where: { clinicaId } });
    // Verificar se número já tem conversa
    const existente = await prisma.waConversa.findFirst({
      where: { instanciaId: instancia.id, numeroWhatsapp: numero }
    });
    if (!existente) {
      await evolutionApi.enviarTexto(instanceName || instancia.evolutionName, numero, mensagem || 'Olá! 👋 Bem-vindo à nossa clínica. Para marcar consulta escreve *marcar*.');
    }
    return res.json({ success: true, isNew: !existente });
  } catch (error) { return next(error); }
});

export default router;
