import { Resend } from 'resend';
import { config } from './config';
import { logger } from './logger';

const resend = new Resend(config.RESEND_API_KEY);

/**
 * Sends a critical alert email via Resend.
 * Only active in production.
 * 
 * @param subject - The alert subject (will be prefixed with "🚨 ClinicaPlus ALERT: ")
 * @param details - Multi-line details about the incident
 */
export async function sendCriticalAlert(subject: string, details: string): Promise<void> {
  const fullSubject = `🚨 ClinicaPlus ALERT: ${subject}`;
  const timestamp = new Date().toISOString();

  // Log locally always
  logger.error({ subject, details, type: 'alert' }, `CRITICAL ALERT: ${subject}`);

  if (config.NODE_ENV !== 'production') {
    logger.info(`[Alerting] Dry-run: skipped sending email to ${config.ALERT_EMAIL} (not in production)`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'ClinicaPlus System <alerts@clinicaplus.ao>',
      to: [config.ALERT_EMAIL],
      subject: fullSubject,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #d32f2f;">${fullSubject}</h1>
          <p><strong>Occurred at (UTC):</strong> ${timestamp}</p>
          <hr />
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${details}</pre>
          <hr />
          <p style="font-size: 12px; color: #666;">
            This is an automated system alert from ClinicaPlus API.
          </p>
        </div>
      `,
    });

    if (error) {
      logger.error({ error, subject }, 'Failed to send critical alert email via Resend');
    } else {
      logger.info({ id: data?.id, subject }, 'Critical alert email sent successfully');
    }
  } catch (err) {
    logger.error({ err, subject }, 'Unexpected error while sending critical alert');
  }
}
