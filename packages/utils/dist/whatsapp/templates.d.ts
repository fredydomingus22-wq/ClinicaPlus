/**
 * Dados para template de lembrete de agendamento
 */
export interface AppointmentReminderData {
    patientName: string;
    appointmentDate: Date;
    appointmentTime: string;
    doctorName: string;
    specialty: string;
    clinicName: string;
    clinicAddress?: string;
    clinicPhone?: string;
    hoursBefore: number;
}
/**
 * Dados para template de notificação de tratamento
 */
export interface TreatmentNotificationData {
    patientName: string;
    treatmentName: string;
    treatmentDescription?: string;
    progress: number;
    nextSessionDate?: Date;
    nextSessionTime?: string;
    doctorName: string;
    totalSessions: number;
    completedSessions: number;
    clinicName: string;
}
/**
 * Dados para template de cobrança de parcelamento
 */
export interface PaymentReminderData {
    patientName: string;
    contractNumber: string;
    installmentNumber: number;
    totalInstallments: number;
    dueDate: Date;
    amount: number;
    currency: string;
    clinicName: string;
    paymentMethods: string[];
    overdueDays?: number;
}
/**
 * Template de lembrete de agendamento
 */
export declare function appointmentReminderTemplate(data: AppointmentReminderData): string;
/**
 * Template de atualização de plano de tratamento
 */
export declare function treatmentUpdateTemplate(data: TreatmentNotificationData): string;
/**
 * Template de notificação de nova sessão agendada
 */
export declare function treatmentSessionTemplate(data: TreatmentNotificationData): string;
/**
 * Template de lembrete de pagamento de parcela
 */
export declare function paymentReminderTemplate(data: PaymentReminderData): string;
/**
 * Template de confirmação de pagamento
 */
export declare function paymentConfirmationTemplate(data: PaymentReminderData): string;
/**
 * Template de boas-vindas para novo paciente
 */
export declare function welcomeTemplate(data: {
    patientName: string;
    clinicName: string;
    clinicPhone?: string;
    clinicAddress?: string;
}): string;
//# sourceMappingURL=templates.d.ts.map