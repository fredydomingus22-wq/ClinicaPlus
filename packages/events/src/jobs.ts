/**
 * Job types for BullMQ
 */

export const JobNames = {
  EMAIL_SEND: 'cp-emails-send',
  REMINDER_SCHEDULE: 'cp-reminders-schedule',
  WEBHOOK_TRIGGER: 'cp-webhooks-trigger',
  REPORT_GENERATE: 'cp-reports-generate',
  WHATSAPP_MESSAGE: 'cp-whatsapp-message',
  WHATSAPP_MAINTENANCE: 'cp-whatsapp-maintenance',
} as const;

export interface WhatsappMessageJob {
  conversaId?: string;
  numero?: string;
  clinicaId: string;
  texto: string;
  agendamentoId?: string;
}

export interface EmailJob {
  to: string;
  template: 'reminder' | 'registration' | 'fatura';
  data: Record<string, unknown>;
}

export interface ReminderJob {
  agendamentoId: string;
  tipo: '24h' | '2h';
}

export interface WebhookJob {
  webhookId: string;
  entregaId: string;
  tentativa: number;
}

export interface ReportJob {
  clinicaId: string;
  tipo: 'receita' | 'ocupacao';
  parametros: Record<string, unknown>;
  requestedBy: string;
}
