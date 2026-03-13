/**
 * Job types for BullMQ
 */

export const JobNames = {
  EMAIL_SEND: 'notificacao/email.enviar',
  REMINDER_SCHEDULE: 'agendamento/lembrete.agendar',
  WEBHOOK_TRIGGER: 'integracao/webhook.disparar',
  REPORT_GENERATE: 'analise/relatorio.gerar',
} as const;

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
