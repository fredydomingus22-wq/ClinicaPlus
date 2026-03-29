import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

/**
 * Monthly Audit Log Cleanup Job
 * Deletes audit logs older than 2 years as per SECURITY_v2.md requirements.
 * In a production environment, this could be extended to move data to long-term storage (e.g., S3/Glacier).
 */
export async function runAuditCleanup(): Promise<void> {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  logger.info({ before: twoYearsAgo }, 'Starting periodic audit log cleanup (archiving objects > 2 years)');

  try {
    const { count } = await prisma.auditLog.deleteMany({
      where: {
        criadoEm: {
          lt: twoYearsAgo,
        },
      },
    });

    logger.info({ count, before: twoYearsAgo }, 'Audit log cleanup completed successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to run audit log cleanup job');
  }
}
