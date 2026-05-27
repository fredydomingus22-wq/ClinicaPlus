/**
 * Job types for BullMQ
 */
export declare const JobNames: {
    readonly EMAIL_SEND: "cp-emails-send";
    readonly REMINDER_SCHEDULE: "cp-reminders-schedule";
    readonly WEBHOOK_TRIGGER: "cp-webhooks-trigger";
    readonly REPORT_GENERATE: "cp-reports-generate";
    readonly WHATSAPP_MESSAGE: "cp-whatsapp-message";
    readonly WHATSAPP_MAINTENANCE: "cp-whatsapp-maintenance";
    readonly TRATAMENTO_GERAR_SESSOES: "cp-tratamento-gerar-sessoes";
    readonly REPORT_AGT: "cp-report-agt";
    readonly APPOINTMENT_EXPIRATION: "cp-appointment-expiration";
};
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
export interface TratamentoGerarSessoesJob {
    planoId: string;
    clinicaId: string;
}
export interface ReportAgtJob {
    faturaId: string;
    clinicaId: string;
}
