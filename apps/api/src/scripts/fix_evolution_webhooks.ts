import { prisma } from '../lib/prisma';
import { evolutionApi } from '../lib/evolutionApi';
import { logger } from '../lib/logger';
import { config } from '../lib/config';

/**
 * Script para actualizar o Webhook de todas as instâncias da Evolution API
 * de acordo com o actual API_PUBLIC_URL.
 */
async function fixWebhooks(): Promise<void> {
  logger.info({ apiPublicUrl: config.API_PUBLIC_URL }, '--- Iniciando Actualização de Webhooks Evolution ---');
  
  if (config.API_PUBLIC_URL.includes('localhost') && config.NODE_ENV === 'production') {
    logger.error('AVISO: API_PUBLIC_URL ainda aponta para localhost mas estás em PRODUCTION.');
  }

  try {
    const instâncias = await prisma.waInstancia.findMany();
    const webhookUrl = `${config.API_PUBLIC_URL}/api/whatsapp/webhook`;

    logger.info({ count: instâncias.length, webhookUrl }, 'Encontradas instâncias para actualizar.');

    for (const inst of instâncias) {
      try {
        await evolutionApi.actualizarWebhook(inst.evolutionName, webhookUrl);
        logger.info({ instance: inst.evolutionName }, '✅ Webhook actualizado com sucesso');
      } catch (err: unknown) {
        const error = err as Error;
        logger.error({ 
          instance: inst.evolutionName, 
          error: error.message 
        }, '❌ Falha ao actualizar webhook');
      }
    }

    logger.info('--- Processo Concluído ---');
  } catch (error: unknown) {
    const err = error as Error;
    logger.error({ error: err.message }, 'Falha geral no script de webhooks');
  } finally {
    await prisma.$disconnect();
  }
}

fixWebhooks();
