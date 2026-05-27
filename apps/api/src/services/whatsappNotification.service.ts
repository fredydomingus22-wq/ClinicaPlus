import { evolutionApi } from '../lib/evolutionApi';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { 
  getPacienteContact, 
  type WhatsAppContact 
} from '../lib/whatsapp/contactResolver';
import {
  appointmentReminderTemplate,
  treatmentUpdateTemplate,
  treatmentSessionTemplate,
  paymentReminderTemplate,
  paymentConfirmationTemplate,
  welcomeTemplate,
  type AppointmentReminderData,
  type TreatmentNotificationData,
  type PaymentReminderData,
} from '@clinicaplus/utils';

/**
 * Resultado de envio de notificação
 */
export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  contact: WhatsAppContact;
}

/**
 * Opções de envio de notificação
 */
export interface NotificationOptions {
  instanceName: string;
  delay?: number; // delay em ms entre mensagens
}

/**
 * Serviço de notificações WhatsApp
 */
export const whatsappNotificationService = {
  /**
   * Envia lembrete de agendamento
   */
  async sendAppointmentReminder(
    pacienteId: string,
    clinicaId: string,
    data: AppointmentReminderData,
    options: NotificationOptions
  ): Promise<NotificationResult> {
    try {
      const contact = await getPacienteContact(pacienteId, clinicaId);
      const message = appointmentReminderTemplate(data);
      
      const result = await evolutionApi.enviarTexto(
        options.instanceName,
        contact.jid,
        message
      );

      logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Lembrete enviado para ${contact.phone}`);

      return {
        success: true,
        messageId: result.key.id,
        contact,
      };
    } catch (error) {
      logger.error({ error }, `[WhatsApp] Erro ao enviar lembrete`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        contact: { phone: '', jid: '', name: '', type: 'paciente', id: pacienteId },
      };
    }
  },

  /**
   * Envia atualização de plano de tratamento
   */
  async sendTreatmentUpdate(
    pacienteId: string,
    clinicaId: string,
    data: TreatmentNotificationData,
    options: NotificationOptions
  ): Promise<NotificationResult> {
    try {
      const contact = await getPacienteContact(pacienteId, clinicaId);
      const message = treatmentUpdateTemplate(data);
      
      const result = await evolutionApi.enviarTexto(
        options.instanceName,
        contact.jid,
        message
      );

      logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Atualização de tratamento enviada para ${contact.phone}`);

      return {
        success: true,
        messageId: result.key.id,
        contact,
      };
    } catch (error) {
      logger.error({ error }, `[WhatsApp] Erro ao enviar atualização de tratamento`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        contact: { phone: '', jid: '', name: '', type: 'paciente', id: pacienteId },
      };
    }
  },

  /**
   * Envia notificação de nova sessão de tratamento
   */
  async sendTreatmentSession(
    pacienteId: string,
    clinicaId: string,
    data: TreatmentNotificationData,
    options: NotificationOptions
  ): Promise<NotificationResult> {
    try {
      const contact = await getPacienteContact(pacienteId, clinicaId);
      const message = treatmentSessionTemplate(data);
      
      const result = await evolutionApi.enviarTexto(
        options.instanceName,
        contact.jid,
        message
      );

      logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Sessão de tratamento enviada para ${contact.phone}`);

      return {
        success: true,
        messageId: result.key.id,
        contact,
      };
    } catch (error) {
      logger.error({ error }, `[WhatsApp] Erro ao enviar sessão de tratamento`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        contact: { phone: '', jid: '', name: '', type: 'paciente', id: pacienteId },
      };
    }
  },

  /**
   * Envia lembrete de pagamento de parcela
   */
  async sendPaymentReminder(
    pacienteId: string,
    clinicaId: string,
    data: PaymentReminderData,
    options: NotificationOptions
  ): Promise<NotificationResult> {
    try {
      const contact = await getPacienteContact(pacienteId, clinicaId);
      const message = paymentReminderTemplate(data);
      
      const result = await evolutionApi.enviarTexto(
        options.instanceName,
        contact.jid,
        message
      );

      logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Lembrete de pagamento enviado para ${contact.phone}`);

      return {
        success: true,
        messageId: result.key.id,
        contact,
      };
    } catch (error) {
      logger.error({ error }, `[WhatsApp] Erro ao enviar lembrete de pagamento`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        contact: { phone: '', jid: '', name: '', type: 'paciente', id: pacienteId },
      };
    }
  },

  /**
   * Envia confirmação de pagamento
   */
  async sendPaymentConfirmation(
    pacienteId: string,
    clinicaId: string,
    data: PaymentReminderData,
    options: NotificationOptions
  ): Promise<NotificationResult> {
    try {
      const contact = await getPacienteContact(pacienteId, clinicaId);
      const message = paymentConfirmationTemplate(data);
      
      const result = await evolutionApi.enviarTexto(
        options.instanceName,
        contact.jid,
        message
      );

      logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Confirmação de pagamento enviada para ${contact.phone}`);

      return {
        success: true,
        messageId: result.key.id,
        contact,
      };
    } catch (error) {
      logger.error({ error }, `[WhatsApp] Erro ao enviar confirmação de pagamento`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        contact: { phone: '', jid: '', name: '', type: 'paciente', id: pacienteId },
      };
    }
  },

  /**
   * Envia mensagem de boas-vindas
   */
  async sendWelcome(
    pacienteId: string,
    clinicaId: string,
    data: {
      patientName: string;
      clinicName: string;
      clinicPhone?: string;
      clinicAddress?: string;
    },
    options: NotificationOptions
  ): Promise<NotificationResult> {
    try {
      const contact = await getPacienteContact(pacienteId, clinicaId);
      const message = welcomeTemplate(data);
      
      const result = await evolutionApi.enviarTexto(
        options.instanceName,
        contact.jid,
        message
      );

      logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Boas-vindas enviada para ${contact.phone}`);

      return {
        success: true,
        messageId: result.key.id,
        contact,
      };
    } catch (error) {
      logger.error({ error }, `[WhatsApp] Erro ao enviar boas-vindas`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        contact: { phone: '', jid: '', name: '', type: 'paciente', id: pacienteId },
      };
    }
  },

  /**
   * Envia mensagem customizada
   */
  async sendCustomMessage(
    pacienteId: string,
    clinicaId: string,
    message: string,
    options: NotificationOptions
  ): Promise<NotificationResult> {
    try {
      const contact = await getPacienteContact(pacienteId, clinicaId);
      
      const result = await evolutionApi.enviarTexto(
        options.instanceName,
        contact.jid,
        message
      );

      logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Mensagem customizada enviada para ${contact.phone}`);

      return {
        success: true,
        messageId: result.key.id,
        contact,
      };
    } catch (error) {
      logger.error({ error }, `[WhatsApp] Erro ao enviar mensagem customizada`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        contact: { phone: '', jid: '', name: '', type: 'paciente', id: pacienteId },
      };
    }
  },

  /**
   * Envia mensagem em massa para múltiplos pacientes
   */
  async sendBulkMessages(
    pacienteIds: string[],
    clinicaId: string,
    message: string,
    options: NotificationOptions
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const delay = options.delay || 1000;

    for (const pacienteId of pacienteIds) {
      const result = await this.sendCustomMessage(pacienteId, clinicaId, message, options);
      results.push(result);
      
      // Delay entre mensagens para evitar bloqueio
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  },

  /**
   * Obtém instância WhatsApp ativa da clínica
   */
  async getActiveInstance(clinicaId: string): Promise<string | null> {
    const instancia = await prisma.waInstancia.findFirst({
      where: {
        clinicaId,
        estado: 'CONECTADO',
      },
      select: {
        evolutionName: true,
      },
    });

    return instancia?.evolutionName || null;
  },

  /**
   * Verifica se a instância está conectada
   */
  async isInstanceConnected(instanceName: string): Promise<boolean> {
    try {
      const state = await evolutionApi.estadoConexao(instanceName);
      return state?.instance?.state === 'open';
    } catch (error) {
      logger.error({ error, instanceName }, '[WhatsApp] Erro ao verificar estado da instância');
      return false;
    }
  },
};
