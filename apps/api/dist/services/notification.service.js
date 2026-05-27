"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const resend_1 = require("resend");
const config_1 = require("../lib/config");
const logger_1 = require("../lib/logger");
const emailTemplates_1 = require("../lib/emailTemplates");
const prisma_1 = require("../lib/prisma");
const queues_1 = require("../lib/queues");
const resend = new resend_1.Resend(config_1.config.RESEND_API_KEY);
// FROM address — In production, this should be a verified domain.
const FROM = 'ClinicaPlus <noreply@zimbotechia.site>';
/**
 * Notification Service
 * Orchestrates all business-to-patient communications.
 */
exports.notificationService = {
    /**
     * Sends an appointment confirmation email to the patient.
     */
    async sendConfirmacaoAgendamento(data) {
        if (!data.pacienteEmail) {
            logger_1.logger.info({ pacienteNome: data.pacienteNome }, 'Confirmation email skipped: No email provided');
            return;
        }
        try {
            // Fetch contacts independently — email must not fail if contacts are unavailable
            let contactos = [];
            try {
                contactos = await prisma_1.prisma.contactoClinica.findMany({
                    where: { clinicaId: data.clinicaId },
                    orderBy: { ordem: 'asc' }
                });
            }
            catch (contactErr) {
                logger_1.logger.warn({ contactErr }, 'Could not fetch clinic contacts for email footer — sending without footer contacts');
            }
            await resend.emails.send({
                from: FROM,
                to: data.pacienteEmail,
                subject: `Agendamento Confirmado — ClinicaPlus`,
                html: emailTemplates_1.emailTemplates.confirmacao({ ...data, contactos }),
            });
            logger_1.logger.info({ email: data.pacienteEmail }, 'Confirmation email sent');
        }
        catch (err) {
            logger_1.logger.error({ err, email: data.pacienteEmail }, 'Failed to send confirmation email');
        }
    },
    /**
     * Sends a reminder email for an upcoming appointment.
     */
    async sendLembrete(data) {
        if (!data.pacienteEmail)
            return;
        try {
            let contactos = [];
            try {
                contactos = await prisma_1.prisma.contactoClinica.findMany({
                    where: { clinicaId: data.clinicaId },
                    orderBy: { ordem: 'asc' }
                });
            }
            catch (contactErr) {
                logger_1.logger.warn({ contactErr }, 'Could not fetch clinic contacts for email footer');
            }
            await resend.emails.send({
                from: FROM,
                to: data.pacienteEmail,
                subject: `Lembrete de Consulta — ${data.horasAntecedencia}h — ClinicaPlus`,
                html: emailTemplates_1.emailTemplates.lembrete({ ...data, contactos }),
            });
            logger_1.logger.info({ email: data.pacienteEmail, h: data.horasAntecedencia }, 'Reminder email sent');
        }
        catch (err) {
            logger_1.logger.error({ err, email: data.pacienteEmail }, 'Failed to send reminder email');
        }
    },
    /**
     * Sends a cancellation notice to the patient.
     */
    async sendCancelamento(data) {
        if (!data.pacienteEmail)
            return;
        try {
            let contactos = [];
            try {
                contactos = await prisma_1.prisma.contactoClinica.findMany({
                    where: { clinicaId: data.clinicaId },
                    orderBy: { ordem: 'asc' }
                });
            }
            catch (contactErr) {
                logger_1.logger.warn({ contactErr }, 'Could not fetch clinic contacts for email footer');
            }
            await resend.emails.send({
                from: FROM,
                to: data.pacienteEmail,
                subject: `Agendamento Cancelado — ClinicaPlus`,
                html: emailTemplates_1.emailTemplates.cancelamento({ ...data, contactos }),
            });
            logger_1.logger.info({ email: data.pacienteEmail }, 'Cancellation email sent');
        }
        catch (err) {
            logger_1.logger.error({ err, email: data.pacienteEmail }, 'Failed to send cancellation email');
        }
    },
    /**
     * Sends a welcome email to a new staff member.
     * Kept and adapted from previous version.
     */
    async sendStaffWelcomeEmail(data) {
        try {
            const loginUrl = `${config_1.config.FRONTEND_URL}/login`;
            const roleLabel = data.papel === 'MEDICO' ? 'Médico(a)' : data.papel === 'RECEPCIONISTA' ? 'Recepcionista' : 'Membro da Equipa';
            const html = `
        <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: #2563eb; padding: 32px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">ClinicaPlus</h1>
            <p style="color: #bfdbfe; margin: 4px 0 0; font-size: 14px;">${data.clinicaNome}</p>
          </div>
          <div style="padding: 32px; background: white;">
            <h2 style="margin: 0 0 16px; color: #1e293b;">Bem-vindo(a) à Equipa!</h2>
            <p>Olá, <strong>${data.nome}</strong>,</p>
            <p>A sua conta de <strong>${roleLabel}</strong> foi criada com sucesso no sistema ClinicaPlus.</p>
            
            ${data.clearPassword ? `
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0 0 8px;"><strong>Dados de Acesso Temporários:</strong></p>
              <p style="margin: 0 0 8px;"><strong>E-mail:</strong> ${data.email}</p>
              <p style="margin: 0;"><strong>Palavra-passe:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${data.clearPassword}</code></p>
            </div>
            ` : ''}

            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginUrl}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                Aceder ao Painel
              </a>
            </div>

            <p style="color: #64748b; font-size: 14px;">
              Por segurança, recomendados que altere a sua palavra-passe após o primeiro acesso.
            </p>
          </div>
          <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
             <p style="color: #64748b; font-size: 12px; margin: 0;">© 2026 ClinicaPlus — Gestão Clínica</p>
          </div>
        </div>
      `;
            await resend.emails.send({
                from: FROM,
                to: data.email,
                subject: `Bem-vindo(a) à ClinicaPlus — Credenciais de Acesso`,
                html,
            });
            logger_1.logger.info({ email: data.email, role: data.papel }, 'Staff welcome email sent');
        }
        catch (err) {
            logger_1.logger.error({ err, email: data.email }, 'Failed to send staff welcome email');
        }
    },
    /**
     * Sends a welcome email to the clinic's primary email.
     */
    async sendClinicaWelcomeEmail(data) {
        try {
            await resend.emails.send({
                from: FROM,
                to: data.email,
                subject: `Bem-vinda à ClinicaPlus — ${data.nome}`,
                html: emailTemplates_1.emailTemplates.clinicaBoasVindas(data),
            });
            logger_1.logger.info({ email: data.email }, 'Clinica welcome email sent');
        }
        catch (err) {
            logger_1.logger.error({ err, email: data.email }, 'Failed to send clinica welcome email');
        }
    },
    /**
     * Sends an admin welcome email with temporary credentials.
     */
    async sendAdminWelcomeEmail(data) {
        try {
            const url = `${config_1.config.FRONTEND_URL}/login`;
            await resend.emails.send({
                from: FROM,
                to: data.email,
                subject: `Credenciais de Acesso — ${data.clinicaNome}`,
                html: emailTemplates_1.emailTemplates.adminBoasVindas({ ...data, url }),
            });
            logger_1.logger.info({ email: data.email }, 'Admin welcome email sent');
        }
        catch (err) {
            logger_1.logger.error({ err, email: data.email }, 'Failed to send admin welcome email');
        }
    },
    /**
     * Sends an email warning about the grace period.
     */
    async enviarEmailGracePeriod(clinica) {
        try {
            const hoje = new Date();
            const diasRestantes = Math.ceil((clinica.subscricaoValidaAte.getTime() - hoje.getTime()) / (1000 * 3600 * 24)) + 7;
            await resend.emails.send({
                from: FROM,
                to: clinica.email,
                subject: `Subscrição Expirada — Período de Graça — ClinicaPlus`,
                html: emailTemplates_1.emailTemplates.gracePeriod({
                    clinicaNome: clinica.nome,
                    diasRestantes,
                    dataExpiracao: clinica.subscricaoValidaAte,
                }),
            });
            logger_1.logger.info({ clinicaId: clinica.id }, 'Grace period email sent');
        }
        catch (err) {
            logger_1.logger.error({ err, clinicaId: clinica.id }, 'Failed to send grace period email');
        }
    },
    /**
     * Sends an email informing that the account has been suspended.
     */
    async enviarEmailContaSuspensa(clinicaId) {
        try {
            const clinica = await prisma_1.prisma.clinica.findUniqueOrThrow({ where: { id: clinicaId } });
            await resend.emails.send({
                from: FROM,
                to: clinica.email,
                subject: `Conta Suspensa — ClinicaPlus`,
                html: emailTemplates_1.emailTemplates.contaSuspensa({
                    clinicaNome: clinica.nome,
                }),
            });
            logger_1.logger.info({ clinicaId }, 'Account suspended email sent');
        }
        catch (err) {
            logger_1.logger.error({ err, clinicaId }, 'Failed to send account suspended email');
        }
    },
    /**
     * Sends a password reset email.
     */
    async sendResetPassword(data) {
        try {
            await resend.emails.send({
                from: FROM,
                to: data.email,
                subject: `Recuperar Palavra-passe — ClinicaPlus`,
                html: emailTemplates_1.emailTemplates.resetPassword({
                    nome: data.nome,
                    resetUrl: data.resetUrl,
                    expiresInMinutes: data.expiresInMinutes
                }),
            });
            logger_1.logger.info({ email: data.email }, 'Password reset email sent');
        }
        catch (err) {
            logger_1.logger.error({ err, email: data.email }, 'Failed to send password reset email');
            throw err;
        }
    },
    /**
     * Schedules reminders (24h and 2h before) for an appointment.
     * Handles both DB record creation (audit) and BullMQ job addition (delivery).
     */
    async scheduleReminders(agendamentoId, clinicaId, dataHora, tx) {
        const db = tx || prisma_1.prisma;
        const now = new Date();
        try {
            // 1. Fetch clinic config
            const configClinica = await db.configuracaoClinica.findUnique({
                where: { clinicaId },
            });
            const remindersToCreate = [];
            // 24h Reminder
            if (configClinica?.lembrete24h ?? true) {
                const sendAt = new Date(dataHora.getTime() - 24 * 60 * 60 * 1000);
                if (sendAt > now) {
                    remindersToCreate.push({
                        clinicaId,
                        agendamentoId,
                        tipo: 'H24',
                        agendadoPara: sendAt,
                    });
                }
            }
            // 2h Reminder
            if (configClinica?.lembrete2h ?? true) {
                const sendAt = new Date(dataHora.getTime() - 2 * 60 * 60 * 1000);
                if (sendAt > now) {
                    remindersToCreate.push({
                        clinicaId,
                        agendamentoId,
                        tipo: 'H2',
                        agendadoPara: sendAt,
                    });
                }
            }
            if (remindersToCreate.length === 0)
                return;
            // 2. Persist in DB for audit/history
            // Note: createMany might not be available on all transaction clients depending on usage, 
            // but in this project it's fine.
            await db.lembreteAgendamento.createMany({
                data: remindersToCreate,
            });
            // 3. Queue in BullMQ for delivery (Delayed Jobs)
            // We don't do this inside the transaction to avoid holding DB locks 
            // while talking to Redis, but we do it immediately after if no tx,
            // or the caller should handle it.
            // BUT, to keep it simple and professional, we add them to BullMQ.
            // Since they have specific jobIds, even if the transaction retries, it's idempotent.
            for (const r of remindersToCreate) {
                const sendAt = new Date(r.agendadoPara);
                const delay = sendAt.getTime() - now.getTime();
                if (delay > 0) {
                    const tipoJob = r.tipo === 'H24' ? '24h' : '2h';
                    await queues_1.reminderQueue.add('reminder-schedule', { agendamentoId, tipo: tipoJob }, {
                        jobId: `reminder-${tipoJob}-${agendamentoId}`,
                        delay,
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 3600000 }
                    });
                }
            }
            logger_1.logger.info({ agendamentoId, count: remindersToCreate.length }, 'Reminders scheduled and queued');
        }
        catch (err) {
            logger_1.logger.error({ err, agendamentoId }, 'Failed to schedule reminders');
            // We don't throw here to avoid blocking the main appointment flow 
            // as reminders are secondary.
        }
    },
    /**
     * Cancels pending reminders for an appointment.
     */
    async cancelReminders(agendamentoId) {
        try {
            // 1. Mark as cancelled in DB
            await prisma_1.prisma.lembreteAgendamento.updateMany({
                where: { agendamentoId, enviadoEm: null },
                data: {
                    enviadoEm: new Date(),
                    sucesso: false,
                    erro: 'Cancelado pelo utilizador/sistema'
                },
            });
            // 2. Remove from BullMQ
            await queues_1.reminderQueue.remove(`reminder-24h-${agendamentoId}`);
            await queues_1.reminderQueue.remove(`reminder-2h-${agendamentoId}`);
            logger_1.logger.info({ agendamentoId }, 'Pending reminders cancelled');
        }
        catch (err) {
            logger_1.logger.error({ err, agendamentoId }, 'Failed to cancel reminders');
        }
    },
};
