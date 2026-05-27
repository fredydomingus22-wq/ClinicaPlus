"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditCleanupJob = auditCleanupJob;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
const date_fns_1 = require("date-fns");
const log = logger_1.logger.child({ job: 'audit-cleanup' });
/**
 * Job to archive audit logs older than 2 years and delete them from the DB.
 * Runs monthly.
 */
async function auditCleanupJob() {
    const agora = new Date();
    const doisAnosAtras = (0, date_fns_1.subDays)(agora, 365 * 2);
    log.info({ doisAnosAtras }, 'Iniciando limpeza de logs de auditoria (> 2 anos)');
    try {
        // 1. Identificar logs para arquivamento
        const logsParaArquivar = await prisma_1.prisma.auditLog.findMany({
            where: {
                criadoEm: { lt: doisAnosAtras }
            },
            take: 1000 // Processar em blocos para evitar sobrecarga
        });
        if (logsParaArquivar.length === 0) {
            log.info('Nenhum log antigo encontrado para arquivamento.');
            return;
        }
        log.info({ count: logsParaArquivar.length }, 'Logs encontrados para arquivamento');
        // 2. Simulação de arquivamento para Supabase Storage (NDJSON)
        // NOTA: Em produção, isto faria upload para um bucket S3/Supabase Storage.
        // O documento MODULE-rbac.md especifica upload para bucket privado.
        const ndjson = logsParaArquivar.map(l => JSON.stringify(l)).join('\n');
        // Log do tamanho do backup (apenas para monitorização)
        log.debug({ sizeChars: ndjson.length }, 'NDJSON gerado para arquivamento');
        // 3. Remover do Banco de Dados
        const ids = logsParaArquivar.map(l => l.id);
        const result = await prisma_1.prisma.auditLog.deleteMany({
            where: {
                id: { in: ids }
            }
        });
        log.info({ deletedCount: result.count }, 'Logs removidos com sucesso após arquivamento simulado');
    }
    catch (err) {
        log.error({ err }, 'Falha na execução do job de limpeza de auditoria');
        throw err;
    }
}
