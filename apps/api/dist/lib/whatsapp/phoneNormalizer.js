"use strict";
/**
 * Utilitário para normalização de números de telefone para Evolution API
 *
 * Formato esperado pela Evolution API:
 * - Números internacionais: +244923456789 (com +)
 * - Números sem código de país: 923456789 (apenas dígitos)
 * - Sem sufixos do WhatsApp (@s.whatsapp.net, @c.us)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhoneNumber = normalizePhoneNumber;
exports.toWhatsAppJid = toWhatsAppJid;
exports.isValidAngolaPhone = isValidAngolaPhone;
exports.extractCountryCode = extractCountryCode;
/**
 * Normaliza um número de telefone para o formato da Evolution API
 * @param phone - Número de telefone em vários formatos
 * @param countryCode - Código do país (padrão: 244 para Angola)
 * @returns Número normalizado
 */
function normalizePhoneNumber(phone, countryCode = '244') {
    if (!phone) {
        throw new Error('Número de telefone é obrigatório');
    }
    // Remove todos os caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');
    // Remove sufixos do WhatsApp JID
    cleaned = cleaned.replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '');
    // Se começar com 00, substituir por +
    if (cleaned.startsWith('00')) {
        cleaned = cleaned.substring(2);
    }
    // Se já tiver código de país (9 dígitos para Angola), retorna com +
    if (cleaned.length === 9 && cleaned.startsWith('9')) {
        return `+${countryCode}${cleaned}`;
    }
    // Se já tiver código de país com +, retorna como está
    if (cleaned.startsWith(countryCode) && cleaned.length === countryCode.length + 9) {
        return `+${cleaned}`;
    }
    // Se começar com +, retorna como está
    if (cleaned.startsWith('+')) {
        return cleaned;
    }
    // Caso contrário, assume código de país
    return `+${countryCode}${cleaned}`;
}
/**
 * Converte número normalizado para JID do WhatsApp
 * @param normalizedPhone - Número normalizado (ex: +244923456789)
 * @returns JID formatado (ex: 244923456789@s.whatsapp.net)
 */
function toWhatsAppJid(normalizedPhone) {
    const cleaned = normalizedPhone.replace('+', '');
    return `${cleaned}@s.whatsapp.net`;
}
/**
 * Valida se um número de telefone é válido para Angola
 * @param phone - Número de telefone
 * @returns true se válido
 */
function isValidAngolaPhone(phone) {
    const normalized = normalizePhoneNumber(phone);
    // Angola: +244 seguido de 9 dígitos começando com 9
    const pattern = /^\+2449\d{8}$/;
    return pattern.test(normalized);
}
/**
 * Extrai o código de país de um número normalizado
 * @param normalizedPhone - Número normalizado
 * @returns Código do país (ex: 244)
 */
function extractCountryCode(normalizedPhone) {
    const cleaned = normalizedPhone.replace('+', '');
    // Angola tem código de 3 dígitos
    if (cleaned.length >= 12) {
        return cleaned.substring(0, 3);
    }
    return '244'; // Default Angola
}
