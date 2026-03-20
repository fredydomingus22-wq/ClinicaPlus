import { Router } from 'express';
import { webhooksService } from '../services/webhooks.service';
import { WebhookCreateSchema, WebhookUpdateSchema, EventoWebhook } from '@clinicaplus/types';
import { AppError } from '../lib/AppError';
import { requirePlan } from '../middleware/requirePlan';
import { prisma } from '../lib/prisma';
import { webhookQueue } from '../lib/queues';

const router = Router();

// Todas as rotas de gestão de Webhooks requerem plano PRO
router.use(requirePlan('PRO'));

/**
 * GET /api/webhooks
 */
router.get('/', async (req, res, next) => {
  try {
    const webhooks = await webhooksService.list(req.clinica.id);
    res.json({ success: true, data: webhooks });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/webhooks
 */
router.post('/', async (req, res, next) => {
  try {
    const validated = WebhookCreateSchema.safeParse(req.body);
    if (!validated.success) {
      throw new AppError('Dados inválidos', 400, 'VALIDATION_ERROR');
    }

    const webhook = await webhooksService.create(validated.data, req.clinica.id, req.user.id);
    res.status(201).json({ success: true, data: webhook });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/webhooks/:id
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const validated = WebhookUpdateSchema.safeParse(req.body);
    if (!validated.success) {
      throw new AppError('Dados inválidos', 400, 'VALIDATION_ERROR');
    }

    const webhook = await webhooksService.update(req.params.id, validated.data, req.clinica.id, req.user.id);
    res.json({ success: true, data: webhook });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/webhooks/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await webhooksService.delete(req.params.id, req.clinica.id, req.user.id);
    res.json({ success: true, message: 'Webhook removido com sucesso' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/webhooks/:id/entregas
 */
router.get('/:id/entregas', async (req, res, next) => {
  try {
    const entregas = await prisma.webhookEntrega.findMany({
      where: { 
        webhookId: req.params.id,
        webhook: { clinicaId: req.clinica.id }
      },
      orderBy: { criadoEm: 'desc' },
      take: 50
    });
    res.json({ success: true, data: entregas });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/webhooks/:id/testar
 */
router.post('/:id/testar', async (req, res, next) => {
  try {
    const webhook = await prisma.webhook.findFirstOrThrow({
      where: { id: req.params.id, clinicaId: req.clinica.id }
    });

    const mockPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Este é um evento de teste'
    };

    // Usamos um evento fictício para teste ou o primeiro da lista
    const evento = (webhook.eventos as EventoWebhook[])[0] || EventoWebhook.AGENDAMENTO_CRIADO;

    await webhooksService.trigger(evento, mockPayload, req.clinica.id);
    
    res.json({ success: true, message: 'Evento de teste enfileirado' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/webhooks/:id/entregas/:entregaId/reenviar
 */
router.post('/:id/entregas/:entregaId/reenviar', async (req, res, next) => {
  try {
    const entrega = await prisma.webhookEntrega.findFirstOrThrow({
      where: { 
        id: req.params.entregaId,
        webhookId: req.params.id,
        webhook: { clinicaId: req.clinica.id }
      }
    });

    await webhookQueue.add(
      'deliver',
      { 
        webhookId: entrega.webhookId, 
        entregaId: entrega.id, 
        tentativa: 1 
      },
      { 
        jobId: `webhook-retry-${entrega.id}-${Date.now()}`, 
        attempts: 5, 
        backoff: { type: 'exponential', delay: 60000 } 
      }
    );

    res.json({ success: true, message: 'Reenvio enfileirado' });
  } catch (err) {
    next(err);
  }
});

export default router;
