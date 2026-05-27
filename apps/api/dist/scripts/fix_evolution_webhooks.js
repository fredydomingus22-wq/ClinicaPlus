"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const evolutionApi_1 = require("../lib/evolutionApi");
const logger_1 = require("../lib/logger");
const config_1 = require("../lib/config");
/**
 * Script para actualizar o Webhook de todas as instâncias da Evolution API
 * de acordo com o actual API_PUBLIC_URL.
 */
async function fixWebhooks() {
    logger_1.logger.info({ apiPublicUrl: config_1.config.API_PUBLIC_URL }, '--- Iniciando Actualização de Webhooks Evolution ---');
    if (config_1.config.API_PUBLIC_URL.includes('localhost') && config_1.config.NODE_ENV === 'production') {
        logger_1.logger.error('AVISO: API_PUBLIC_URL ainda aponta para localhost mas estás em PRODUCTION.');
    }
    try {
        const instâncias = await prisma_1.prisma.waInstancia.findMany();
        const webhookUrl = `${config_1.config.API_PUBLIC_URL}/api/whatsapp/webhook`;
        logger_1.logger.info({ count: instâncias.length, webhookUrl }, 'Encontradas instâncias para actualizar.');
        for (const inst of instâncias) {
            try {
                await evolutionApi_1.evolutionApi.actualizarWebhook(inst.evolutionName, webhookUrl);
                logger_1.logger.info({ instance: inst.evolutionName }, '✅ Webhook actualizado com sucesso');
            }
            catch (err) {
                const error = err;
                logger_1.logger.error({
                    instance: inst.evolutionName,
                    error: error.message
                }, '❌ Falha ao actualizar webhook');
            }
        }
        logger_1.logger.info('--- Processo Concluído ---');
    }
    catch (error) {
        const err = error;
        logger_1.logger.error({ error: err.message }, 'Falha geral no script de webhooks');
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
fixWebhooks();
