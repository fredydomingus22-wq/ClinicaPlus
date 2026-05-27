"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentReminderTemplate = appointmentReminderTemplate;
exports.treatmentUpdateTemplate = treatmentUpdateTemplate;
exports.treatmentSessionTemplate = treatmentSessionTemplate;
exports.paymentReminderTemplate = paymentReminderTemplate;
exports.paymentConfirmationTemplate = paymentConfirmationTemplate;
exports.welcomeTemplate = welcomeTemplate;
const contactResolver_1 = require("./contactResolver");
/**
 * Template de lembrete de agendamento
 */
function appointmentReminderTemplate(data) {
    const greeting = (0, contactResolver_1.formatGreeting)(data.patientName);
    const dateStr = data.appointmentDate.toLocaleDateString('pt-PT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    const urgencyMessage = data.hoursBefore <= 2
        ? '⚠️ *Lembrete Urgente*'
        : '📅 *Lembrete de Consulta*';
    return `${urgencyMessage}

${greeting}!

Temos uma consulta agendada para você:

📆 *Data:* ${dateStr}
⏰ *Horário:* ${data.appointmentTime}
👨‍⚕️ *Médico:* ${data.doctorName}
🏥 *Especialidade:* ${data.specialty}
📍 *Clínica:* ${data.clinicName}

${data.clinicAddress ? `📍 *Endereço:* ${data.clinicAddress}\n` : ''}${data.clinicPhone ? `📞 *Telefone:* ${data.clinicPhone}\n` : ''}---
${data.hoursBefore <= 2
        ? 'Por favor, confirme sua presença respondendo:\n✅ Confirmar\n❌ Cancelar'
        : 'Por favor, chegue com 15 minutos de antecedência.'}

Se precisar remarcar, entre em contato conosco.`;
}
/**
 * Template de atualização de plano de tratamento
 */
function treatmentUpdateTemplate(data) {
    const greeting = (0, contactResolver_1.formatGreeting)(data.patientName);
    const progressPercent = Math.round(data.progress);
    let message = `🏥 *Atualização do Plano de Tratamento*

${greeting}!

Aqui está o progresso do seu tratamento:

📋 *Tratamento:* ${data.treatmentName}
${data.treatmentDescription ? `📝 *Descrição:* ${data.treatmentDescription}\n` : ''}👨‍⚕️ *Médico Responsável:* ${data.doctorName}
📊 *Progresso:* ${progressPercent}%
📈 *Sessões:* ${data.completedSessions}/${data.totalSessions}`;
    if (data.nextSessionDate && data.nextSessionTime) {
        const dateStr = data.nextSessionDate.toLocaleDateString('pt-PT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
        message += `\n\n📅 *Próxima Sessão:* ${dateStr} às ${data.nextSessionTime}`;
    }
    message += `\n\n📍 *Clínica:* ${data.clinicName}`;
    if (progressPercent >= 100) {
        message += `\n\n🎉 *Parabéns! Seu tratamento foi concluído com sucesso!*`;
    }
    else if (progressPercent >= 75) {
        message += `\n\n✨ *Você está quase lá! Continue assim!*`;
    }
    return message;
}
/**
 * Template de notificação de nova sessão agendada
 */
function treatmentSessionTemplate(data) {
    const greeting = (0, contactResolver_1.formatGreeting)(data.patientName);
    if (!data.nextSessionDate || !data.nextSessionTime) {
        return '';
    }
    const dateStr = data.nextSessionDate.toLocaleDateString('pt-PT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    return `📅 *Nova Sessão Agendada*

${greeting}!

Sua próxima sessão do tratamento foi agendada:

📋 *Tratamento:* ${data.treatmentName}
📆 *Data:* ${dateStr}
⏰ *Horário:* ${data.nextSessionTime}
👨‍⚕️ *Médico:* ${data.doctorName}
📍 *Clínica:* ${data.clinicName}

📊 *Progresso Atual:* ${data.completedSessions}/${data.totalSessions} sessões concluídas

Por favor, chegue com 15 minutos de antecedência.

Se precisar remarcar, entre em contato conosco.`;
}
/**
 * Template de lembrete de pagamento de parcela
 */
function paymentReminderTemplate(data) {
    const greeting = (0, contactResolver_1.formatGreeting)(data.patientName);
    const dateStr = data.dueDate.toLocaleDateString('pt-PT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const isOverdue = data.overdueDays && data.overdueDays > 0;
    const urgencyMessage = isOverdue
        ? '⚠️ *Pagamento em Atraso*'
        : '💰 *Lembrete de Pagamento*';
    const amountFormatted = new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: data.currency,
    }).format(data.amount);
    let message = `${urgencyMessage}

${greeting}!

Lembrete sobre a parcela do seu contrato:

📄 *Contrato:* ${data.contractNumber}
📦 *Parcela:* ${data.installmentNumber}/${data.totalInstallments}
💵 *Valor:* ${amountFormatted}
📅 *Vencimento:* ${dateStr}`;
    if (isOverdue) {
        message += `\n⚠️ *Atraso:* ${data.overdueDays} dias`;
    }
    message += `\n\n📍 *Clínica:* ${data.clinicName}

💳 *Formas de Pagamento:*
${data.paymentMethods.map(m => `• ${m}`).join('\n')}`;
    if (isOverdue) {
        message += `\n\nPor favor, regularize seu pagamento o mais breve possível para evitar juros.`;
    }
    else {
        message += `\n\nPor favor, efetue o pagamento até a data de vencimento.`;
    }
    return message;
}
/**
 * Template de confirmação de pagamento
 */
function paymentConfirmationTemplate(data) {
    const greeting = (0, contactResolver_1.formatGreeting)(data.patientName);
    const dateStr = new Date().toLocaleDateString('pt-PT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const amountFormatted = new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: data.currency,
    }).format(data.amount);
    return `✅ *Pagamento Confirmado*

${greeting}!

Recebemos seu pagamento com sucesso:

📄 *Contrato:* ${data.contractNumber}
📦 *Parcela:* ${data.installmentNumber}/${data.totalInstallments}
💵 *Valor Pago:* ${amountFormatted}
📅 *Data do Pagamento:* ${dateStr}

📍 *Clínica:* ${data.clinicName}

Obrigado pela pontualidade! 💙`;
}
/**
 * Template de boas-vindas para novo paciente
 */
function welcomeTemplate(data) {
    const greeting = (0, contactResolver_1.formatGreeting)(data.patientName);
    return `👋 *Bem-vindo(a) à ${data.clinicName}!*

${greeting}!

É um prazer ter você conosco. Estamos aqui para cuidar da sua saúde com o melhor atendimento.

${data.clinicAddress ? `📍 *Endereço:* ${data.clinicAddress}\n` : ''}${data.clinicPhone ? `📞 *Telefone:* ${data.clinicPhone}\n` : ''}---
💡 *Dica:* Você pode agendar suas consultas pelo nosso aplicativo ou WhatsApp.

Se precisar de ajuda, estamos à disposição!

Equipe ${data.clinicName} 💙`;
}
//# sourceMappingURL=templates.js.map