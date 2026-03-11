import { Router } from 'express';
import { notificacoesService } from '../services/notificacoes.service';

const router = Router();

/**
 * GET /api/notificacoes
 * List last 50 notifications for the authenticated user.
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await notificacoesService.listByUser(req.user.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/notificacoes/read-all
 * Mark all notifications for the user as read.
 */
router.patch('/read-all', async (req, res, next) => {
  try {
    await notificacoesService.markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/notificacoes/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await notificacoesService.markAsRead(id, req.user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
