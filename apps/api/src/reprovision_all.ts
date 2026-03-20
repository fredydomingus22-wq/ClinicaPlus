import { prisma } from './lib/prisma';
import { waAutomacaoService } from './services/wa-automacao.service';
import { logger } from './lib/logger';

async function reprovisionAll(): Promise<void> {
  logger.info('--- Iniciando Re-provisionamento de Workflows n8n ---');
  
  try {
    const automacoes = await prisma.waAutomacao.findMany({
      where: {
        n8nWorkflowId: { not: null }
      }
    });

    logger.info({ count: automacoes.length }, 'Encontradas automações com workflows no n8n.');

    for (const auto of automacoes) {
      logger.info({ tipo: auto.tipo, id: auto.id, clinicaId: auto.clinicaId }, 'Processando automação...');
      
      try {
        await waAutomacaoService.provisionarWorkflow(auto.id, auto.clinicaId);
        logger.info({ id: auto.id }, '✅ Sucesso: Workflow actualizado');
      } catch (err: unknown) {
        const error = err as Error;
        logger.error({ id: auto.id, error: error.message }, '❌ Erro ao processar automação');
      }
    }

    logger.info('--- Processo Concluído ---');
  } catch (error) {
    logger.error({ error }, 'Falha geral no script');
  } finally {
    await prisma.$disconnect();
  }
}

reprovisionAll();
