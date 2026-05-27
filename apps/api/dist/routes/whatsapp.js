"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wa_instancia_service_1 = require("../services/wa-instancia.service");
const wa_automacao_service_1 = require("../services/wa-automacao.service");
const wa_webhook_service_1 = require("../services/wa-webhook.service");
const wa_meta_webhook_service_1 = require("../services/wa-meta-webhook.service");
const wa_conversa_service_1 = require("../services/wa-conversa.service");
const wa_actividade_service_1 = require("../services/wa-actividade.service");
const whatsappNotification_service_1 = require("../services/whatsappNotification.service");
const requirePlan_1 = require("../middleware/requirePlan");
const requirePermission_1 = require("../middleware/requirePermission");
const verificarHmacEvolution_1 = require("../middleware/verificarHmacEvolution");
const client_1 = require("@prisma/client");
const logger_1 = require("../lib/logger");
const authenticate_1 = require("../middleware/authenticate");
const tenant_1 = require("../middleware/tenant");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const prisma_1 = require("../lib/prisma");
const evolutionApi_1 = require("../lib/evolutionApi");
const metaCloudApi_1 = require("../lib/metaCloudApi");
const auditLog_service_1 = require("../services/auditLog.service");
const secretCrypto_1 = require("../lib/secretCrypto");
const crypto_1 = __importDefault(require("crypto"));
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// --- GESTÃO DA INSTÂNCIA (ADMIN, Plano PRO+) ---
// Listar todas as instâncias da clínica
router.get('/instancias', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const instancias = await wa_instancia_service_1.waInstanciaService.listarPorClinica(clinicaId);
        return res.json(instancias);
    }
    catch (error) {
        return next(error);
    }
});
router.post('/instancias', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), (0, requirePermission_1.requirePermission)('whatsapp', 'manage'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const userId = req.user.id;
        const instancia = await wa_instancia_service_1.waInstanciaService.criar(clinicaId, userId);
        return res.status(201).json(instancia);
    }
    catch (error) {
        return next(error);
    }
});
router.get('/instancias/:id/qrcode', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { id } = req.params;
        const qrcode = await wa_instancia_service_1.waInstanciaService.obterQrCode(id, clinicaId);
        return res.json(qrcode);
    }
    catch (error) {
        return next(error);
    }
});
router.get('/instancias/:id/estado', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { id } = req.params;
        const instancia = await wa_instancia_service_1.waInstanciaService.sincronizarEstado(id, clinicaId);
        if (!instancia) {
            return res.status(404).json({ message: 'Instância não encontrada' });
        }
        return res.json({
            estado: instancia.estado,
            numeroTelefone: instancia.numeroTelefone,
            qrCodeBase64: instancia.qrCodeBase64
        });
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/instancias/:id', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), (0, requirePermission_1.requirePermission)('whatsapp', 'manage'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { id } = req.params;
        await wa_instancia_service_1.waInstanciaService.eliminar(id, clinicaId);
        return res.json({ success: true });
    }
    catch (error) {
        return next(error);
    }
});
// --- GESTÃO DE AUTOMAÇÕES (ADMIN, Plano PRO+) ---
router.get('/automacoes', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { instanciaId } = req.query;
        const automacoes = await wa_automacao_service_1.waAutomacaoService.listar(clinicaId, instanciaId);
        return res.json(automacoes);
    }
    catch (error) {
        return next(error);
    }
});
router.get('/templates', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), async (_req, res, next) => {
    try {
        const templates = await wa_automacao_service_1.waAutomacaoService.obterTemplates();
        return res.json(templates);
    }
    catch (error) {
        return next(error);
    }
});
router.post('/automacoes', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), (0, requirePermission_1.requirePermission)('whatsapp', 'manage'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { tipo, instanciaId, waInstanciaId } = req.body;
        const resolvedInstanciaId = instanciaId || waInstanciaId;
        if (!resolvedInstanciaId) {
            return res.status(400).json({ message: 'instanciaId é obrigatório' });
        }
        const automacao = await wa_automacao_service_1.waAutomacaoService.adicionar(clinicaId, tipo, resolvedInstanciaId);
        return res.status(201).json(automacao);
    }
    catch (error) {
        return next(error);
    }
});
router.patch('/automacoes/:id', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), (0, requirePermission_1.requirePermission)('whatsapp', 'manage'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { id } = req.params;
        const automacao = await wa_automacao_service_1.waAutomacaoService.configurar(id, req.body, clinicaId);
        return res.json(automacao);
    }
    catch (error) {
        return next(error);
    }
});
router.post('/automacoes/:id/activar', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), (0, requirePermission_1.requirePermission)('whatsapp', 'manage'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const userId = req.user.id;
        const { id } = req.params;
        await wa_automacao_service_1.waAutomacaoService.activar(id, clinicaId, userId);
        return res.json({ success: true });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/automacoes/:id/desactivar', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), (0, requirePermission_1.requirePermission)('whatsapp', 'manage'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const userId = req.user.id;
        const { id } = req.params;
        await wa_automacao_service_1.waAutomacaoService.desactivar(id, clinicaId, userId);
        return res.json({ success: true });
    }
    catch (error) {
        return next(error);
    }
});
// --- WEBHOOK DA EVOLUTION API (Baileys — HMAC) ---
router.post('/webhook', verificarHmacEvolution_1.verificarHmacEvolution, async (req, res) => {
    try {
        const { event, instance, data } = req.body;
        await wa_webhook_service_1.waWebhookService.handle(instance, event, data);
        res.status(200).send('OK');
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Erro no processamento do webhook do WhatsApp');
        res.status(200).send('Error logged');
    }
});
// ─── META CLOUD API ──────────────────────────────────────────────────────────
// Schema de validação para criar instância Meta
const criarInstanciaMetaSchema = zod_1.z.object({
    metaPhoneNumberId: zod_1.z.string().min(1, 'Phone Number ID obrigatório'),
    metaWabaId: zod_1.z.string().min(1, 'WABA ID obrigatório'),
    metaAccessToken: zod_1.z.string().min(1, 'Access Token obrigatório'),
});
/**
 * POST /whatsapp/instancias/meta
 * Cria uma instância Meta Cloud (sem QR code, sem Evolution API).
 * Requer plano PRO+ e permissão whatsapp.manage.
 */
router.post('/instancias/meta', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), (0, requirePermission_1.requirePermission)('whatsapp', 'manage'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const userId = req.user.id;
        const parsed = criarInstanciaMetaSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Dados inválidos',
                errors: parsed.error.flatten().fieldErrors,
            });
        }
        const { metaPhoneNumberId, metaWabaId, metaAccessToken } = parsed.data;
        const clinica = await prisma_1.prisma.clinica.findUniqueOrThrow({ where: { id: clinicaId } });
        const existente = await prisma_1.prisma.waInstancia.findFirst({ where: { clinicaId } });
        if (existente && clinica.plano !== client_1.Plano.ENTERPRISE) {
            return res.status(409).json({ message: 'Esta clínica já possui uma instância configurada.' });
        }
        // Nome único para a instância (sem Evolution, mas precisa ser único na BD)
        const instanceName = `meta-${clinica.slug}-${crypto_1.default.randomBytes(3).toString('hex')}`;
        const instancia = await prisma_1.prisma.waInstancia.create({
            data: {
                clinicaId,
                evolutionName: instanceName,
                evolutionToken: crypto_1.default.randomUUID(),
                tipoIntegracao: 'META_CLOUD',
                metaPhoneNumberId,
                metaWabaId,
                metaAccessToken: (0, secretCrypto_1.encryptSecret)(metaAccessToken),
                estado: 'CONECTADO', // Meta está sempre "conectada" via token
                atualizadoEm: new Date(),
            },
        });
        await auditLog_service_1.auditLogService.log({
            actorId: userId,
            clinicaId,
            accao: 'CREATE',
            recurso: 'wa_instancia_meta',
            recursoId: instancia.id,
            depois: { tipoIntegracao: 'META_CLOUD', metaPhoneNumberId, metaWabaId },
        });
        logger_1.logger.info({ instanciaId: instancia.id, metaPhoneNumberId }, 'Instância Meta Cloud criada');
        return res.status(201).json({
            id: instancia.id,
            tipoIntegracao: instancia.tipoIntegracao,
            metaPhoneNumberId: instancia.metaPhoneNumberId,
            metaWabaId: instancia.metaWabaId,
            estado: instancia.estado,
            criadoEm: instancia.criadoEm,
        });
    }
    catch (error) {
        return next(error);
    }
});
/**
 * GET /whatsapp/webhook/meta
 * Verificação do webhook Meta (hub.challenge handshake).
 * Público — a Meta acede sem autenticação.
 */
router.get('/webhook/meta', (req, res) => {
    try {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        const responseChallenge = metaCloudApi_1.metaCloudApi.responderChallenge(mode, token, challenge);
        logger_1.logger.info({ mode, token }, 'Webhook Meta verificado com sucesso');
        return res.status(200).send(responseChallenge);
    }
    catch (err) {
        logger_1.logger.warn({ err }, 'Falha na verificação do webhook Meta');
        return res.status(403).send('Forbidden');
    }
});
/**
 * POST /whatsapp/webhook/meta
 * Recebe eventos da Meta Cloud API.
 * Verificação HMAC-SHA256 com X-Hub-Signature-256.
 * Público — a Meta não usa o nosso auth.
 * IMPORTANTE: Express deve ter bodyParser configurado com verify para preservar rawBody.
 */
router.post('/webhook/meta', async (req, res) => {
    try {
        // Verificar assinatura HMAC
        const signature = req.headers['x-hub-signature-256'];
        if (signature) {
            // rawBody é injectado pelo middleware do Express no server.ts (verify option)
            const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
            metaCloudApi_1.metaCloudApi.verificarAssinaturaWebhook(rawBody, signature);
        }
        // A Meta espera 200 imediatamente — processar de forma assíncrona
        res.status(200).send('EVENT_RECEIVED');
        // Processar em background (não bloquear response)
        setImmediate(async () => {
            try {
                await wa_meta_webhook_service_1.waMetaWebhookService.handle(req.body);
            }
            catch (err) {
                logger_1.logger.error({ err }, 'Erro assíncrono ao processar webhook Meta');
            }
        });
    }
    catch (err) {
        const e = err;
        logger_1.logger.error({ err }, 'Erro crítico no webhook Meta');
        res.status(e.statusCode ?? 401).json({ message: e.message });
    }
});
// --- ACTIVIDADE E RELATÓRIOS (ADMIN) ---
router.get('/actividade', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const actividade = await wa_actividade_service_1.waActividadeService.listarRecente(clinicaId);
        return res.json(actividade);
    }
    catch (error) {
        return next(error);
    }
});
router.get('/metricas', authenticate_1.authenticate, tenant_1.tenantMiddleware, (0, requirePlan_1.requirePlan)(client_1.Plano.PRO), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const metricas = await wa_actividade_service_1.waActividadeService.obterMetricas(clinicaId);
        return res.json(metricas);
    }
    catch (error) {
        return next(error);
    }
});
router.get('/conversas', authenticate_1.authenticate, tenant_1.tenantMiddleware, async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const conversas = await wa_conversa_service_1.waConversaService.listarActivas(clinicaId);
        return res.json(conversas);
    }
    catch (error) {
        return next(error);
    }
});
// ─── GATEWAY DE ENVIO UNIFICADO (CHAMADO PELO FASTAPI) ──────────────────────
// Endpoint interno, deve ser protegido pela API Key do Intel Service
router.post('/internal/enviar', apiKeyAuth_1.apiKeyAuth, (0, apiKeyAuth_1.requireScope)('WRITE_AGENDAMENTOS'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { instanciaId, telefone, mensagem } = req.body;
        const instancia = await prisma_1.prisma.waInstancia.findFirstOrThrow({
            where: { id: instanciaId, clinicaId }
        });
        if (instancia.tipoIntegracao === 'META_CLOUD') {
            if (!instancia.metaPhoneNumberId || !instancia.metaAccessToken) {
                throw new Error('Instância Meta incompleta');
            }
            const resolvedMetaAccessToken = (0, secretCrypto_1.decryptSecret)(instancia.metaAccessToken);
            if (typeof mensagem === 'string') {
                await metaCloudApi_1.metaCloudApi.enviarTexto(instancia.metaPhoneNumberId, resolvedMetaAccessToken, telefone.replace('+', ''), mensagem);
            }
            else if (typeof mensagem === 'object') {
                // Detectar o tipo de interativo
                if (mensagem.type === 'list') {
                    await metaCloudApi_1.metaCloudApi.enviarInteractivoLista(instancia.metaPhoneNumberId, resolvedMetaAccessToken, telefone.replace('+', ''), mensagem.payload);
                }
                else if (mensagem.type === 'button') {
                    await metaCloudApi_1.metaCloudApi.enviarInteractivoBotoes(instancia.metaPhoneNumberId, resolvedMetaAccessToken, telefone.replace('+', ''), mensagem.payload);
                }
            }
        }
        else {
            // Evolution API fallback: converte os interativos para texto bruto caso seja tentado enviar json 
            const textoDescritivo = typeof mensagem === 'string' ? mensagem : JSON.stringify(mensagem);
            await evolutionApi_1.evolutionApi.enviarTexto(instancia.evolutionName, telefone.replace('+', ''), textoDescritivo);
        }
        // Persistir mensagem enviada pela IA
        const conversa = await prisma_1.prisma.waConversa.findFirst({
            where: { instanciaId: instancia.id, numeroWhatsapp: telefone.replace('+', '') }
        });
        if (conversa) {
            await prisma_1.prisma.waMensagem.create({
                data: {
                    conversaId: conversa.id,
                    conteudo: typeof mensagem === 'object' ? `[INTERATIVO ${mensagem.type}]` : mensagem,
                    direcao: 'SAIDA',
                    evolutionMsgId: `intel-${Date.now()}`
                }
            });
        }
        return res.json({ success: true });
    }
    catch (error) {
        return next(error);
    }
});
// --- ENDPOINTS PARA O n8n (FLUXOS) ---
// Obter conversa (GET /fluxo/conversa?numero=244...) — usado pelos templates n8n
router.get('/fluxo/conversa', apiKeyAuth_1.apiKeyAuth, (0, apiKeyAuth_1.requireScope)('READ_AGENDAMENTOS'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { numero } = req.query;
        if (!numero)
            return res.status(400).json({ message: 'numero é obrigatório' });
        const conversa = await wa_conversa_service_1.waConversaService.obterConversa(numero, clinicaId);
        return res.json({ data: conversa });
    }
    catch (error) {
        return next(error);
    }
});
// Iniciar fluxo (chamado pelo n8n ao receber mensagem)
router.post('/fluxo/inicio', apiKeyAuth_1.apiKeyAuth, (0, apiKeyAuth_1.requireScope)('WRITE_AGENDAMENTOS'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { numero, instanceName } = req.body;
        const instancia = await prisma_1.prisma.waInstancia.findFirstOrThrow({
            where: instanceName ? { evolutionName: instanceName, clinicaId } : { clinicaId }
        });
        await wa_conversa_service_1.waConversaService.etapaInicio(numero, clinicaId, instancia.evolutionName);
        return res.json({ success: true });
    }
    catch (error) {
        return next(error);
    }
});
// Processar resposta genérica (router interno)
router.post('/fluxo/resposta', apiKeyAuth_1.apiKeyAuth, (0, apiKeyAuth_1.requireScope)('WRITE_AGENDAMENTOS'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { numero, resposta, instanceName } = req.body;
        await wa_conversa_service_1.waConversaService.processarResposta(numero, clinicaId, instanceName, resposta);
        return res.json({ success: true });
    }
    catch (error) {
        return next(error);
    }
});
// Endpoints por etapa — chamados directamente pelos templates n8n (MODULE-whatsapp.md §8)
router.post('/fluxo/especialidade', apiKeyAuth_1.apiKeyAuth, (0, apiKeyAuth_1.requireScope)('WRITE_AGENDAMENTOS'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { numero, resposta, instanceName } = req.body;
        const instancia = await prisma_1.prisma.waInstancia.findFirstOrThrow({
            where: instanceName ? { evolutionName: instanceName, clinicaId } : { clinicaId }
        });
        await wa_conversa_service_1.waConversaService.processarResposta(numero, clinicaId, instanceName || instancia.evolutionName, resposta);
        return res.json({ success: true });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/fluxo/medico', apiKeyAuth_1.apiKeyAuth, (0, apiKeyAuth_1.requireScope)('WRITE_AGENDAMENTOS'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { numero, resposta, instanceName } = req.body;
        const instancia = await prisma_1.prisma.waInstancia.findFirstOrThrow({
            where: instanceName ? { evolutionName: instanceName, clinicaId } : { clinicaId }
        });
        await wa_conversa_service_1.waConversaService.processarResposta(numero, clinicaId, instanceName || instancia.evolutionName, resposta);
        return res.json({ success: true });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/fluxo/horario', apiKeyAuth_1.apiKeyAuth, (0, apiKeyAuth_1.requireScope)('WRITE_AGENDAMENTOS'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { numero, resposta, instanceName } = req.body;
        const instancia = await prisma_1.prisma.waInstancia.findFirstOrThrow({
            where: instanceName ? { evolutionName: instanceName, clinicaId } : { clinicaId }
        });
        await wa_conversa_service_1.waConversaService.processarResposta(numero, clinicaId, instanceName || instancia.evolutionName, resposta);
        return res.json({ success: true });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/fluxo/confirmar', apiKeyAuth_1.apiKeyAuth, (0, apiKeyAuth_1.requireScope)('WRITE_AGENDAMENTOS'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { numero, resposta, instanceName } = req.body;
        const instancia = await prisma_1.prisma.waInstancia.findFirstOrThrow({
            where: instanceName ? { evolutionName: instanceName, clinicaId } : { clinicaId }
        });
        await wa_conversa_service_1.waConversaService.processarResposta(numero, clinicaId, instanceName || instancia.evolutionName, resposta);
        return res.json({ success: true });
    }
    catch (error) {
        return next(error);
    }
});
// Enviar lembrete — chamado pelo job BullMQ via n8n
router.post('/fluxo/enviar-lembrete', apiKeyAuth_1.apiKeyAuth, (0, apiKeyAuth_1.requireScope)('WRITE_AGENDAMENTOS'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { agendamentoId, instanceName, template } = req.body;
        // Buscar agendamento e enviar lembrete via Evolution API
        const agendamento = await prisma_1.prisma.agendamento.findFirstOrThrow({
            where: { id: agendamentoId, clinicaId },
            include: { paciente: true, medico: true }
        });
        const instancia = await prisma_1.prisma.waInstancia.findFirstOrThrow({
            where: instanceName ? { evolutionName: instanceName, clinicaId } : { clinicaId }
        });
        const telefone = agendamento.paciente.telefone?.replace('+', '') ?? '';
        if (!telefone)
            return res.status(400).json({ message: 'Paciente sem telefone' });
        const { format } = await Promise.resolve().then(() => __importStar(require('date-fns')));
        const { pt } = await Promise.resolve().then(() => __importStar(require('date-fns/locale')));
        const texto = (template || 'Olá {nome}! Lembrete da consulta {data} às {hora}.')
            .replace('{nome}', agendamento.paciente.nome)
            .replace('{data}', format(agendamento.dataHora, "d 'de' MMMM", { locale: pt }))
            .replace('{hora}', format(agendamento.dataHora, 'HH:mm'))
            .replace('{medico}', agendamento.medico.nome)
            .replace('{clinica}', '');
        await evolutionApi_1.evolutionApi.enviarTexto(instanceName || instancia.evolutionName, telefone, texto);
        return res.json({ success: true });
    }
    catch (error) {
        return next(error);
    }
});
// --- ENDPOINTS INTERNOS PARA WORKER (API Key Auth) ---
// Enviar lembrete de agendamento (chamado pelo worker)
router.post('/lembrete', apiKeyAuth_1.apiKeyAuth, (0, apiKeyAuth_1.requireScope)('WRITE_AGENDAMENTOS'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { agendamentoId, tipo } = req.body;
        const agendamento = await prisma_1.prisma.agendamento.findFirstOrThrow({
            where: { id: agendamentoId, clinicaId },
            include: { paciente: true, medico: true, clinica: true }
        });
        const instancia = await whatsappNotification_service_1.whatsappNotificationService.getActiveInstance(clinicaId);
        if (!instancia) {
            return res.status(404).json({ message: 'Instância WhatsApp não encontrada' });
        }
        const result = await whatsappNotification_service_1.whatsappNotificationService.sendAppointmentReminder(agendamento.pacienteId, clinicaId, {
            patientName: agendamento.paciente.nome,
            appointmentDate: agendamento.dataHora,
            appointmentTime: agendamento.dataHora.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
            doctorName: agendamento.medico?.nome || 'Médico',
            specialty: 'Consulta',
            clinicName: agendamento.clinica.nome,
            clinicAddress: agendamento.clinica.endereco || '',
            clinicPhone: agendamento.clinica.telefone || '',
            hoursBefore: tipo === '24h' ? 24 : 2,
        }, { instanceName: instancia, delay: 1000 });
        return res.json(result);
    }
    catch (error) {
        return next(error);
    }
});
// Enviar notificação de tratamento (chamado pelo worker)
router.post('/tratamento-sessao', apiKeyAuth_1.apiKeyAuth, (0, apiKeyAuth_1.requireScope)('WRITE_AGENDAMENTOS'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { planoId } = req.body;
        const plano = await prisma_1.prisma.planoTratamento.findFirstOrThrow({
            where: { id: planoId, clinicaId },
            include: {
                paciente: true,
                medico: true,
                clinica: true,
                tipoTratamento: true,
                sessoes: { orderBy: { dataHora: 'asc' } }
            }
        });
        const instancia = await whatsappNotification_service_1.whatsappNotificationService.getActiveInstance(clinicaId);
        if (!instancia) {
            return res.status(404).json({ message: 'Instância WhatsApp não encontrada' });
        }
        const proximaSessao = plano.sessoes[0];
        if (!proximaSessao) {
            return res.status(400).json({ message: 'Não há sessões agendadas' });
        }
        const sessoesConcluidas = plano.sessoes.filter((s) => s.estado === 'CONCLUIDO').length;
        const result = await whatsappNotification_service_1.whatsappNotificationService.sendTreatmentSession(plano.pacienteId, clinicaId, {
            patientName: plano.paciente.nome,
            treatmentName: plano.tipoTratamento.nome,
            treatmentDescription: plano.descricao || plano.tipoTratamento.descricao || '',
            progress: (sessoesConcluidas / plano.totalSessoes) * 100,
            nextSessionDate: proximaSessao.dataHora,
            nextSessionTime: proximaSessao.dataHora.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
            doctorName: plano.medico?.nome || 'Médico',
            totalSessions: plano.totalSessoes,
            completedSessions: sessoesConcluidas,
            clinicName: plano.clinica.nome,
        }, { instanceName: instancia, delay: 1000 });
        return res.json(result);
    }
    catch (error) {
        return next(error);
    }
});
// Enviar lembrete de cobrança (chamado pelo worker)
router.post('/cobranca-lembrete', apiKeyAuth_1.apiKeyAuth, (0, apiKeyAuth_1.requireScope)('WRITE_AGENDAMENTOS'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { faturaId } = req.body;
        const fatura = await prisma_1.prisma.fatura.findFirstOrThrow({
            where: { id: faturaId, clinicaId },
            include: { paciente: true, clinica: true }
        });
        const instancia = await whatsappNotification_service_1.whatsappNotificationService.getActiveInstance(clinicaId);
        if (!instancia) {
            return res.status(404).json({ message: 'Instância WhatsApp não encontrada' });
        }
        const result = await whatsappNotification_service_1.whatsappNotificationService.sendPaymentReminder(fatura.pacienteId, clinicaId, {
            patientName: fatura.paciente.nome,
            contractNumber: fatura.numeroFatura,
            installmentNumber: 1,
            totalInstallments: 1,
            dueDate: fatura.dataVencimento || new Date(),
            amount: fatura.total,
            currency: fatura.moeda || 'AOA',
            clinicName: fatura.clinica.nome,
            paymentMethods: ['Transferência Bancária', 'Multicaixo', 'Dinheiro'],
        }, { instanceName: instancia, delay: 1000 });
        return res.json(result);
    }
    catch (error) {
        return next(error);
    }
});
// Boas-vindas — número novo sem conversa prévia
router.post('/fluxo/boas-vindas', apiKeyAuth_1.apiKeyAuth, (0, apiKeyAuth_1.requireScope)('WRITE_AGENDAMENTOS'), async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { numero, instanceName, mensagem } = req.body;
        const instancia = await prisma_1.prisma.waInstancia.findFirstOrThrow({
            where: instanceName ? { evolutionName: instanceName, clinicaId } : { clinicaId }
        });
        // Verificar se número já tem conversa
        const existente = await prisma_1.prisma.waConversa.findFirst({
            where: { instanciaId: instancia.id, numeroWhatsapp: numero }
        });
        if (!existente) {
            await evolutionApi_1.evolutionApi.enviarTexto(instanceName || instancia.evolutionName, numero, mensagem || 'Olá! 👋 Bem-vindo à nossa clínica. Para marcar consulta escreve *marcar*.');
        }
        return res.json({ success: true, isNew: !existente });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
