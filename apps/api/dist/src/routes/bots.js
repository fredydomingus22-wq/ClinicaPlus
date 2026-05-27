"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.botIntegracaoRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const AppError_1 = require("../lib/AppError");
const evolutionApi_1 = require("../lib/evolutionApi");
const config_1 = require("../lib/config");
const router = (0, express_1.Router)();
exports.botIntegracaoRouter = router;
const prisma = new client_1.PrismaClient();
/**
 * GET /api/bots
 * Lista a integração de bot configurada para a clínica.
 */
router.get('/', async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const bot = await prisma.botIntegracao.findFirst({
            where: { clinicaId },
            include: {
                instancia: true
            }
        });
        res.json(bot || null);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/bots
 * Cria ou atualiza a integração do bot. E sincroniza com a Evolution API injetando variáveis reais!
 */
router.post('/', async (req, res, next) => {
    try {
        const clinicaId = req.clinica.id;
        const { instanciaId, provedor, apiUrl, flowId, apiToken, variaveisGlobais, triggerKeyword, expireTime, unknownMessage, ativo } = req.body;
        if (!instanciaId) {
            throw new AppError_1.AppError('Precisa fornecer um instanciaId do WhatsApp para ligar o bot.', 400);
        }
        // Injetar URLs Globais da Infra SaaS em vez do cliente preencher
        const finalProvider = 'TYPEBOT';
        const finalApiUrl = config_1.config.TYPEBOT_VIEWER_URL;
        const finalFlowId = config_1.config.TYPEBOT_TRIAGEM_FLOW_ID;
        const finalTrigger = triggerKeyword || '#bot';
        const finalExpire = expireTime || 20;
        // Upsert na Base de Dados
        const botDb = await prisma.botIntegracao.upsert({
            where: { instanciaId },
            update: {
                provedor: finalProvider,
                apiUrl: finalApiUrl,
                flowId: finalFlowId,
                apiToken,
                variaveisGlobais,
                triggerKeyword: finalTrigger,
                expireTime: finalExpire,
                unknownMessage,
                ativo
            },
            create: {
                clinicaId,
                instanciaId,
                provedor: finalProvider,
                apiUrl: finalApiUrl,
                flowId: finalFlowId,
                apiToken,
                variaveisGlobais,
                triggerKeyword: finalTrigger,
                expireTime: finalExpire,
                unknownMessage,
                ativo
            }
        });
        // Se estiver associado a uma instância, e o provedor for TYPEBOT, sincroniza com EVOLUTION API
        if (provedor === 'TYPEBOT' || provedor === 'DIFY') {
            const instancia = await prisma.waInstancia.findUnique({
                where: { id: instanciaId },
                include: { clinica: true }
            });
            if (instancia) {
                // Mapear variaveis globais JSON para o formato array da Evolution API {"key", "value"}
                const parsedVariaveis = typeof variaveisGlobais === 'string' ? JSON.parse(variaveisGlobais) : variaveisGlobais;
                const variablesArray = Object.keys(parsedVariaveis).map(key => ({
                    key,
                    value: String(parsedVariaveis[key])
                }));
                // INJEÇÃO NATIVA OBRIGATÓRIA DA RESPOSTA AO USER:
                // Garantindo que a clínica já vai pré-injetada como variável!
                variablesArray.push({ key: 'clinicaNome', value: instancia.clinica.nome || 'Nossa Clínica' });
                variablesArray.push({ key: 'clinicaId', value: clinicaId });
                await evolutionApi_1.evolutionApi.configurarTypebot(instancia.evolutionName, {
                    enabled: ativo,
                    url: apiUrl,
                    typebot: flowId,
                    expire: expireTime,
                    keywordFinish: triggerKeyword || '#sair',
                    unknownMessage: unknownMessage,
                    variables: variablesArray
                });
            }
        }
        res.json(botDb);
    }
    catch (error) {
        next(error);
    }
});
