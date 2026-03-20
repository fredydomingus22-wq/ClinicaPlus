import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { WebhookJob, JobNames } from '@clinicaplus/events';
import crypto from 'crypto';

export const webhookWorker = new Worker<WebhookJob>(
  JobNames.WEBHOOK_TRIGGER,
  async (job: Job<WebhookJob>) => {
    const { webhookId, entregaId } = job.data;
    const log = logger.child({ webhookId, entregaId, jobId: job.id });

    try {
      // 1. Buscar webhook e entrega
      const [webhook, entrega] = await Promise.all([
        prisma.webhook.findUnique({ where: { id: webhookId } }),
        prisma.webhookEntrega.findUnique({ where: { id: entregaId } })
      ]);

      if (!webhook || !entrega) {
        log.error('Webhook or Entrega not found');
        return;
      }

      if (!webhook.ativo) {
        log.warn('Webhook is inactive, skipping');
        return;
      }

      // 2. Preparar payload e assinatura HMAC
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payloadString = JSON.stringify(entrega.payload);
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(`${timestamp}.${payloadString}`)
        .digest('hex');

      // 3. Enviar POST request
      log.info({ url: webhook.url }, 'Sending webhook delivery...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      let statusHttp: number | null = null;
      let resposta: string | null = null;
      let sucesso = false;

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ClinicaPlus-Signature': `sha256=${signature}`,
            'X-ClinicaPlus-Event': entrega.evento,
            'X-ClinicaPlus-Delivery': entrega.id,
            'X-ClinicaPlus-Timestamp': timestamp,
            'User-Agent': 'ClinicaPlus-Webhook/1.0'
          },
          body: payloadString,
          signal: controller.signal
        } as any); // Type cast para contornar limitações do TS no fetch do Node 20

        clearTimeout(timeoutId);
        statusHttp = response.status;
        resposta = (await response.text()).slice(0, 500); // Primeiros 500 chars
        sucesso = response.ok;

      } catch (err) {
        clearTimeout(timeoutId);
        const errorMessage = err instanceof Error ? err.message : String(err);
        resposta = errorMessage.slice(0, 500);
        log.error({ err: errorMessage }, 'Fetch failed during webhook delivery');
      }

      // 4. Gravar resultado e atualizar status global do webhook
      await prisma.$transaction([
        prisma.webhookEntrega.update({
          where: { id: entrega.id },
          data: {
            sucesso,
            statusHttp,
            resposta,
            tentativas: { increment: 1 },
            concluidoEm: new Date()
          }
        }),
        prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            ultimoStatus: statusHttp,
            sucesso
          }
        })
      ]);

      if (!sucesso) {
        // Lançar erro para BullMQ fazer retry se não foi sucesso
        throw new Error(`Webhook delivery failed with status ${statusHttp}`);
      }

      log.info('Webhook delivered successfully');

    } catch (err) {
      log.error({ err }, 'Webhook worker failed');
      throw err; // Retry
    }
  },
  { 
    connection: redis,
    concurrency: 5
  }
);
