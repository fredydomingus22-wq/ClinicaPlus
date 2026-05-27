"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCriticalAlert = sendCriticalAlert;
const resend_1 = require("resend");
const config_1 = require("./config");
const logger_1 = require("./logger");
const resend = new resend_1.Resend(config_1.config.RESEND_API_KEY);
/**
 * Sends a critical alert email via Resend.
 * Only active in production.
 *
 * @param subject - The alert subject (will be prefixed with "🚨 ClinicaPlus ALERT: ")
 * @param details - Multi-line details about the incident
 */
async function sendCriticalAlert(subject, details) {
    const fullSubject = `🚨 ClinicaPlus ALERT: ${subject}`;
    const timestamp = new Date().toISOString();
    // Log locally always
    logger_1.logger.error({ subject, details, type: 'alert' }, `CRITICAL ALERT: ${subject}`);
    if (config_1.config.NODE_ENV !== 'production') {
        logger_1.logger.info(`[Alerting] Dry-run: skipped sending email to ${config_1.config.ALERT_EMAIL} (not in production)`);
        return;
    }
    try {
        const { data, error } = await resend.emails.send({
            from: 'ClinicaPlus System <alerts@clinicaplus.ao>',
            to: [config_1.config.ALERT_EMAIL],
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
            logger_1.logger.error({ error, subject }, 'Failed to send critical alert email via Resend');
        }
        else {
            logger_1.logger.info({ id: data?.id, subject }, 'Critical alert email sent successfully');
        }
    }
    catch (err) {
        logger_1.logger.error({ err, subject }, 'Unexpected error while sending critical alert');
    }
}
