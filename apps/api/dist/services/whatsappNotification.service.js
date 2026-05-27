"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappNotificationService = void 0;
const evolutionApi_1 = require("../lib/evolutionApi");
const logger_1 = require("../lib/logger");
const prisma_1 = require("../lib/prisma");
const contactResolver_1 = require("../lib/whatsapp/contactResolver");
const utils_1 = require("@clinicaplus/utils");
/**
 * Serviço de notificações WhatsApp
 */
exports.whatsappNotificationService = {
    /**
     * Envia lembrete de agendamento
     */
    async sendAppointmentReminder(pacienteId, clinicaId, data, options) {
        try {
            const contact = await (0, contactResolver_1.getPacienteContact)(pacienteId, clinicaId);
            const message = (0, utils_1.appointmentReminderTemplate)(data);
            const result = await evolutionApi_1.evolutionApi.enviarTexto(options.instanceName, contact.jid, message);
            logger_1.logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Lembrete enviado para ${contact.phone}`);
            return {
                success: true,
                messageId: result.key.id,
                contact,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, `[WhatsApp] Erro ao enviar lembrete`);
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
    async sendTreatmentUpdate(pacienteId, clinicaId, data, options) {
        try {
            const contact = await (0, contactResolver_1.getPacienteContact)(pacienteId, clinicaId);
            const message = (0, utils_1.treatmentUpdateTemplate)(data);
            const result = await evolutionApi_1.evolutionApi.enviarTexto(options.instanceName, contact.jid, message);
            logger_1.logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Atualização de tratamento enviada para ${contact.phone}`);
            return {
                success: true,
                messageId: result.key.id,
                contact,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, `[WhatsApp] Erro ao enviar atualização de tratamento`);
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
    async sendTreatmentSession(pacienteId, clinicaId, data, options) {
        try {
            const contact = await (0, contactResolver_1.getPacienteContact)(pacienteId, clinicaId);
            const message = (0, utils_1.treatmentSessionTemplate)(data);
            const result = await evolutionApi_1.evolutionApi.enviarTexto(options.instanceName, contact.jid, message);
            logger_1.logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Sessão de tratamento enviada para ${contact.phone}`);
            return {
                success: true,
                messageId: result.key.id,
                contact,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, `[WhatsApp] Erro ao enviar sessão de tratamento`);
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
    async sendPaymentReminder(pacienteId, clinicaId, data, options) {
        try {
            const contact = await (0, contactResolver_1.getPacienteContact)(pacienteId, clinicaId);
            const message = (0, utils_1.paymentReminderTemplate)(data);
            const result = await evolutionApi_1.evolutionApi.enviarTexto(options.instanceName, contact.jid, message);
            logger_1.logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Lembrete de pagamento enviado para ${contact.phone}`);
            return {
                success: true,
                messageId: result.key.id,
                contact,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, `[WhatsApp] Erro ao enviar lembrete de pagamento`);
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
    async sendPaymentConfirmation(pacienteId, clinicaId, data, options) {
        try {
            const contact = await (0, contactResolver_1.getPacienteContact)(pacienteId, clinicaId);
            const message = (0, utils_1.paymentConfirmationTemplate)(data);
            const result = await evolutionApi_1.evolutionApi.enviarTexto(options.instanceName, contact.jid, message);
            logger_1.logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Confirmação de pagamento enviada para ${contact.phone}`);
            return {
                success: true,
                messageId: result.key.id,
                contact,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, `[WhatsApp] Erro ao enviar confirmação de pagamento`);
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
    async sendWelcome(pacienteId, clinicaId, data, options) {
        try {
            const contact = await (0, contactResolver_1.getPacienteContact)(pacienteId, clinicaId);
            const message = (0, utils_1.welcomeTemplate)(data);
            const result = await evolutionApi_1.evolutionApi.enviarTexto(options.instanceName, contact.jid, message);
            logger_1.logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Boas-vindas enviada para ${contact.phone}`);
            return {
                success: true,
                messageId: result.key.id,
                contact,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, `[WhatsApp] Erro ao enviar boas-vindas`);
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
    async sendCustomMessage(pacienteId, clinicaId, message, options) {
        try {
            const contact = await (0, contactResolver_1.getPacienteContact)(pacienteId, clinicaId);
            const result = await evolutionApi_1.evolutionApi.enviarTexto(options.instanceName, contact.jid, message);
            logger_1.logger.info({ pacienteId, messageId: result.key.id }, `[WhatsApp] Mensagem customizada enviada para ${contact.phone}`);
            return {
                success: true,
                messageId: result.key.id,
                contact,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, `[WhatsApp] Erro ao enviar mensagem customizada`);
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
    async sendBulkMessages(pacienteIds, clinicaId, message, options) {
        const results = [];
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
    async getActiveInstance(clinicaId) {
        const instancia = await prisma_1.prisma.waInstancia.findFirst({
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
    async isInstanceConnected(instanceName) {
        try {
            const state = await evolutionApi_1.evolutionApi.estadoConexao(instanceName);
            return state?.instance?.state === 'open';
        }
        catch (error) {
            logger_1.logger.error({ error, instanceName }, '[WhatsApp] Erro ao verificar estado da instância');
            return false;
        }
    },
};
