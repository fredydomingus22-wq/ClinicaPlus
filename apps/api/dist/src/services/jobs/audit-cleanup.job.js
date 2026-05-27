"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAuditCleanup = runAuditCleanup;
const prisma_1 = require("../../lib/prisma");
const logger_1 = require("../../lib/logger");
/**
 * Monthly Audit Log Cleanup Job
 * Deletes audit logs older than 2 years as per SECURITY_v2.md requirements.
 * In a production environment, this could be extended to move data to long-term storage (e.g., S3/Glacier).
 */
async function runAuditCleanup() {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    logger_1.logger.info({ before: twoYearsAgo }, 'Starting periodic audit log cleanup (archiving objects > 2 years)');
    try {
        const { count } = await prisma_1.prisma.auditLog.deleteMany({
            where: {
                criadoEm: {
                    lt: twoYearsAgo,
                },
            },
        });
        logger_1.logger.info({ count, before: twoYearsAgo }, 'Audit log cleanup completed successfully');
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Failed to run audit log cleanup job');
    }
}
