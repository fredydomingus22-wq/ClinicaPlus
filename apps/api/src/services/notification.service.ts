import { Resend } from 'resend';
import { config } from '../lib/config';
import { logger } from '../lib/logger';
import { emailTemplates } from '../lib/emailTemplates';
import { prisma } from '../lib/prisma';

const resend = new Resend(config.RESEND_API_KEY);

// FROM address — In production, this should be a verified domain.
const FROM = 'ClinicaPlus <noreply@zimbotechia.site>';

/**
 * Notification Service
 * Orchestrates all business-to-patient communications.
 */
export const notificationService = {

  /**
   * Sends an appointment confirmation email to the patient.
   */
  async sendConfirmacaoAgendamento(data: {
    pacienteEmail: string;
    pacienteNome: string;
    medicoNome: string;
    clinicaNome: string;
    dataHora: Date;
    tipo: string;
    clinicaId: string;
  }): Promise<void> {
    if (!data.pacienteEmail) {
      logger.info({ pacienteNome: data.pacienteNome }, 'Confirmation email skipped: No email provided');
      return;
    }

    try {
      // Fetch contacts independently — email must not fail if contacts are unavailable
      let contactos: { tipo: string; valor: string; descricao?: string | null }[] = [];
      try {
        contactos = await prisma.contactoClinica.findMany({
          where: { clinicaId: data.clinicaId },
          orderBy: { ordem: 'asc' }
        });
      } catch (contactErr) {
        logger.warn({ contactErr }, 'Could not fetch clinic contacts for email footer — sending without footer contacts');
      }

      await resend.emails.send({
        from: FROM,
        to: data.pacienteEmail,
        subject: `Agendamento Confirmado — ClinicaPlus`,
        html: emailTemplates.confirmacao({ ...data, contactos }),
      });
      logger.info({ email: data.pacienteEmail }, 'Confirmation email sent');
    } catch (err) {
      logger.error({ err, email: data.pacienteEmail }, 'Failed to send confirmation email');
    }
  },

  /**
   * Sends a reminder email for an upcoming appointment.
   */
  async sendLembrete(data: {
    pacienteEmail: string;
    pacienteNome: string;
    medicoNome: string;
    clinicaNome: string;
    dataHora: Date;
    horasAntecedencia: number;
    clinicaId: string;
  }): Promise<void> {
    if (!data.pacienteEmail) return;

    try {
      let contactos: { tipo: string; valor: string; descricao?: string | null }[] = [];
      try {
        contactos = await prisma.contactoClinica.findMany({
          where: { clinicaId: data.clinicaId },
          orderBy: { ordem: 'asc' }
        });
      } catch (contactErr) {
        logger.warn({ contactErr }, 'Could not fetch clinic contacts for email footer');
      }

      await resend.emails.send({
        from: FROM,
        to: data.pacienteEmail,
        subject: `Lembrete de Consulta — ${data.horasAntecedencia}h — ClinicaPlus`,
        html: emailTemplates.lembrete({ ...data, contactos }),
      });
      logger.info({ email: data.pacienteEmail, h: data.horasAntecedencia }, 'Reminder email sent');
    } catch (err) {
      logger.error({ err, email: data.pacienteEmail }, 'Failed to send reminder email');
    }
  },

  /**
   * Sends a cancellation notice to the patient.
   */
  async sendCancelamento(data: {
    pacienteEmail: string;
    pacienteNome: string;
    medicoNome: string;
    clinicaNome: string;
    dataHora: Date;
    motivo?: string;
    clinicaId: string;
  }): Promise<void> {
    if (!data.pacienteEmail) return;

    try {
      let contactos: { tipo: string; valor: string; descricao?: string | null }[] = [];
      try {
        contactos = await prisma.contactoClinica.findMany({
          where: { clinicaId: data.clinicaId },
          orderBy: { ordem: 'asc' }
        });
      } catch (contactErr) {
        logger.warn({ contactErr }, 'Could not fetch clinic contacts for email footer');
      }

      await resend.emails.send({
        from: FROM,
        to: data.pacienteEmail,
        subject: `Agendamento Cancelado — ClinicaPlus`,
        html: emailTemplates.cancelamento({ ...data, contactos }),
      });
      logger.info({ email: data.pacienteEmail }, 'Cancellation email sent');
    } catch (err) {
      logger.error({ err, email: data.pacienteEmail }, 'Failed to send cancellation email');
    }
  },


  /**
   * Sends a welcome email to a new staff member.
   * Kept and adapted from previous version.
   */
  async sendStaffWelcomeEmail(data: {
    email: string;
    nome: string;
    clearPassword?: string;
    papel: string;
    clinicaNome: string;
  }): Promise<void> {
    try {
      const loginUrl = `${config.FRONTEND_URL}/login`;
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

      logger.info({ email: data.email, role: data.papel }, 'Staff welcome email sent');
    } catch (err) {
      logger.error({ err, email: data.email }, 'Failed to send staff welcome email');
    }
  },

  /**
   * Sends a welcome email to the clinic's primary email.
   */
  async sendClinicaWelcomeEmail(data: {
    email: string;
    nome: string;
    plano: string;
  }): Promise<void> {
    try {
      await resend.emails.send({
        from: FROM,
        to: data.email,
        subject: `Bem-vinda à ClinicaPlus — ${data.nome}`,
        html: emailTemplates.clinicaBoasVindas(data),
      });
      logger.info({ email: data.email }, 'Clinica welcome email sent');
    } catch (err) {
      logger.error({ err, email: data.email }, 'Failed to send clinica welcome email');
    }
  },

  /**
   * Sends an admin welcome email with temporary credentials.
   */
  async sendAdminWelcomeEmail(data: {
    email: string;
    nome: string;
    senhaTemporaria: string;
    clinicaNome: string;
  }): Promise<void> {
    try {
      const url = `${config.FRONTEND_URL}/login`;
      await resend.emails.send({
        from: FROM,
        to: data.email,
        subject: `Credenciais de Acesso — ${data.clinicaNome}`,
        html: emailTemplates.adminBoasVindas({ ...data, url }),
      });
      logger.info({ email: data.email }, 'Admin welcome email sent');
    } catch (err) {
      logger.error({ err, email: data.email }, 'Failed to send admin welcome email');
    }
  },

  /**
   * Sends an email warning about the grace period.
   */
  async enviarEmailGracePeriod(clinica: { id: string; nome: string; email: string; subscricaoValidaAte: Date }): Promise<void> {
    try {
      const hoje = new Date();
      const diasRestantes = Math.ceil((clinica.subscricaoValidaAte.getTime() - hoje.getTime()) / (1000 * 3600 * 24)) + 7;
      
      await resend.emails.send({
        from: FROM,
        to: clinica.email,
        subject: `Subscrição Expirada — Período de Graça — ClinicaPlus`,
        html: emailTemplates.gracePeriod({
          clinicaNome: clinica.nome,
          diasRestantes,
          dataExpiracao: clinica.subscricaoValidaAte,
        }),
      });
      logger.info({ clinicaId: clinica.id }, 'Grace period email sent');
    } catch (err) {
      logger.error({ err, clinicaId: clinica.id }, 'Failed to send grace period email');
    }
  },

  /**
   * Sends an email informing that the account has been suspended.
   */
  async enviarEmailContaSuspensa(clinicaId: string): Promise<void> {
    try {
      const clinica = await prisma.clinica.findUniqueOrThrow({ where: { id: clinicaId } });
      
      await resend.emails.send({
        from: FROM,
        to: clinica.email,
        subject: `Conta Suspensa — ClinicaPlus`,
        html: emailTemplates.contaSuspensa({
          clinicaNome: clinica.nome,
        }),
      });
      logger.info({ clinicaId }, 'Account suspended email sent');
    } catch (err) {
      logger.error({ err, clinicaId }, 'Failed to send account suspended email');
    }
  },

  /**
   * Sends a password reset email.
   */
  async sendResetPassword(data: {
    email: string;
    nome: string;
    resetUrl: string;
    expiresInMinutes: number;
  }): Promise<void> {
    try {
      await resend.emails.send({
        from: FROM,
        to: data.email,
        subject: `Recuperar Palavra-passe — ClinicaPlus`,
        html: emailTemplates.resetPassword({
          nome: data.nome,
          resetUrl: data.resetUrl,
          expiresInMinutes: data.expiresInMinutes
        }),
      });
      logger.info({ email: data.email }, 'Password reset email sent');
    } catch (err) {
      logger.error({ err, email: data.email }, 'Failed to send password reset email');
      throw err;
    }
  },
};
