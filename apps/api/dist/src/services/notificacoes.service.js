"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificacoesService = void 0;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
/**
 * Service to handle web notifications.
 */
class NotificacoesService {
    /**
     * Lists notifications for a specific user.
     */
    async listByUser(userId) {
        const notificacoes = await prisma_1.prisma.notificacao.findMany({
            where: { utilizadorId: userId },
            orderBy: { criadoEm: 'desc' },
            take: 50,
        });
        return notificacoes.map(n => {
            const dto = {
                id: n.id,
                utilizadorId: n.utilizadorId,
                titulo: n.titulo,
                mensagem: n.mensagem,
                tipo: n.tipo,
                lida: n.lida,
                criadoEm: n.criadoEm.toISOString(),
            };
            if (n.url)
                dto.url = n.url;
            return dto;
        });
    }
    /**
     * Marks a notification as read.
     */
    async markAsRead(id, userId) {
        try {
            await prisma_1.prisma.notificacao.update({
                where: { id, utilizadorId: userId },
                data: { lida: true },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, id, userId }, 'Failed to mark notification as read');
        }
    }
    /**
     * Marks all notifications as read for a user.
     */
    async markAllAsRead(userId) {
        try {
            await prisma_1.prisma.notificacao.updateMany({
                where: { utilizadorId: userId, lida: false },
                data: { lida: true },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to mark all notifications as read');
        }
    }
    /**
     * Internal utility to create a new notification.
     */
    async create(data) {
        try {
            let finalUrl = data.url;
            // If URL is generic (starts with / but no role prefix), try to prefix it
            if (finalUrl &&
                finalUrl.startsWith('/') &&
                !['/admin', '/medico', '/paciente', '/recepcao', '/superadmin'].some(p => finalUrl.startsWith(p))) {
                const user = await prisma_1.prisma.utilizador.findUnique({
                    where: { id: data.utilizadorId },
                    select: { papel: true }
                });
                if (user) {
                    const papel = user.papel.toLowerCase();
                    const basePath = papel === 'recepcionista' ? 'recepcao' : papel;
                    finalUrl = `/${basePath}${finalUrl}`;
                }
            }
            await prisma_1.prisma.notificacao.create({
                data: {
                    utilizadorId: data.utilizadorId,
                    titulo: data.titulo,
                    mensagem: data.mensagem,
                    tipo: data.tipo,
                    url: finalUrl || null,
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, data }, 'Failed to create notification');
        }
    }
}
exports.notificacoesService = new NotificacoesService();
