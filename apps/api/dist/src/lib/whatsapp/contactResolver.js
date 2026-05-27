"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactNotFoundError = void 0;
exports.getPacienteContact = getPacienteContact;
exports.getUtilizadorContact = getUtilizadorContact;
exports.getContact = getContact;
exports.getContacts = getContacts;
exports.formatGreeting = formatGreeting;
const prisma_1 = require("../prisma");
const phoneNormalizer_1 = require("./phoneNormalizer");
const logger_1 = require("../logger");
/**
 * Erro quando contato não encontrado
 */
class ContactNotFoundError extends Error {
    constructor(type, id) {
        super(`${type} com ID ${id} não encontrado ou sem telefone`);
        this.name = 'ContactNotFoundError';
    }
}
exports.ContactNotFoundError = ContactNotFoundError;
/**
 * Busca informações de contato de um paciente para notificação WhatsApp
 * @param pacienteId - ID do paciente
 * @param clinicaId - ID da clínica (para validação de segurança)
 * @returns Informações de contato normalizadas
 */
async function getPacienteContact(pacienteId, clinicaId) {
    const paciente = await prisma_1.prisma.paciente.findFirst({
        where: {
            id: pacienteId,
            clinicaId,
            ativo: true,
        },
        select: {
            id: true,
            nome: true,
            telefone: true,
        },
    });
    if (!paciente || !paciente.telefone) {
        throw new ContactNotFoundError('Paciente', pacienteId);
    }
    const normalizedPhone = (0, phoneNormalizer_1.normalizePhoneNumber)(paciente.telefone);
    const jid = `${normalizedPhone.replace('+', '')}@s.whatsapp.net`;
    return {
        phone: normalizedPhone,
        jid,
        name: paciente.nome,
        type: 'paciente',
        id: paciente.id,
    };
}
/**
 * Busca informações de contato de um utilizador para notificação WhatsApp
 * @param utilizadorId - ID do utilizador
 * @param clinicaId - ID da clínica (para validação de segurança)
 * @returns Informações de contato normalizadas
 */
async function getUtilizadorContact(utilizadorId, clinicaId) {
    const utilizador = await prisma_1.prisma.utilizador.findFirst({
        where: {
            id: utilizadorId,
            ...(clinicaId ? { clinicaId } : {}),
            ativo: true,
        },
        select: {
            id: true,
            nome: true,
            paciente: {
                select: {
                    telefone: true,
                },
            },
        },
    });
    if (!utilizador) {
        throw new ContactNotFoundError('Utilizador', utilizadorId);
    }
    // Tenta buscar telefone do paciente associado
    const telefone = utilizador.paciente?.telefone;
    if (!telefone) {
        throw new ContactNotFoundError('Utilizador sem telefone', utilizadorId);
    }
    const normalizedPhone = (0, phoneNormalizer_1.normalizePhoneNumber)(telefone);
    const jid = `${normalizedPhone.replace('+', '')}@s.whatsapp.net`;
    return {
        phone: normalizedPhone,
        jid,
        name: utilizador.nome,
        type: 'utilizador',
        id: utilizador.id,
    };
}
/**
 * Busca contato por ID genérico (paciente ou utilizador)
 * @param id - ID do registro
 * @param type - Tipo de registro
 * @param clinicaId - ID da clínica
 * @returns Informações de contato normalizadas
 */
async function getContact(id, type, clinicaId) {
    if (type === 'paciente') {
        return getPacienteContact(id, clinicaId);
    }
    return getUtilizadorContact(id, clinicaId);
}
/**
 * Busca múltiplos contatos para envio em massa
 * @param ids - Array de IDs
 * @param type - Tipo de registro
 * @param clinicaId - ID da clínica
 * @returns Array de informações de contato
 */
async function getContacts(ids, type, clinicaId) {
    const contacts = [];
    const errors = [];
    for (const id of ids) {
        try {
            const contact = await getContact(id, type, clinicaId);
            contacts.push(contact);
        }
        catch (error) {
            errors.push({
                id,
                error: error instanceof Error ? error.message : 'Erro desconhecido',
            });
        }
    }
    if (errors.length > 0) {
        logger_1.logger.warn({ errors }, `[WhatsApp] ${errors.length} contatos não encontrados`);
    }
    return contacts;
}
/**
 * Formata saudação personalizada
 * @param name - Nome do contato
 * @param formal - Se deve usar tratamento formal (Dr./Dra.)
 * @returns Saudação formatada
 */
function formatGreeting(name, formal = false) {
    const firstName = name.split(' ')[0];
    if (formal) {
        // Verifica se nome parece ser médico (Dr./Dra.)
        if (name.toLowerCase().includes('dr.') || name.toLowerCase().includes('dra.')) {
            return `Olá, ${name}`;
        }
        return `Olá, ${firstName}`;
    }
    return `Olá, ${firstName}`;
}
