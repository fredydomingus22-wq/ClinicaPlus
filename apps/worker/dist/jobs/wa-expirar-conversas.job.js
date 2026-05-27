"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobWaExpirarConversas = jobWaExpirarConversas;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
const date_fns_1 = require("date-fns");
/**
 * Job para expirar conversas do WhatsApp que ficaram sem resposta há mais de 24h.
 */
async function jobWaExpirarConversas() {
    const log = logger_1.logger.child({ job: 'wa-expirar-conversas' });
    log.info('Iniciando job de expiração de conversas WA');
    try {
        const limite = (0, date_fns_1.subHours)(new Date(), 24);
        const result = await prisma_1.prisma.waConversa.updateMany({
            where: {
                estado: { notIn: ['CONCLUIDA', 'EXPIRADA'] },
                ultimaMensagemEm: { lt: limite },
            },
            data: {
                estado: 'EXPIRADA',
            },
        });
        if (result.count > 0) {
            log.info({ count: result.count }, 'Conversas expiradas com sucesso');
        }
    }
    catch (err) {
        log.error({ err }, 'Erro ao expirar conversas');
        throw err;
    }
}
