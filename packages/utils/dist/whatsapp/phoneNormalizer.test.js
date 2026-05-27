"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const phoneNormalizer_1 = require("./phoneNormalizer");
(0, vitest_1.describe)('phoneNormalizer', () => {
    (0, vitest_1.describe)('normalizePhoneNumber', () => {
        (0, vitest_1.it)('deve normalizar número com código de país Angola (+244)', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.normalizePhoneNumber)('+244923456789')).toBe('+244923456789');
        });
        (0, vitest_1.it)('deve normalizar número com 00 antes do código', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.normalizePhoneNumber)('00244923456789')).toBe('+244923456789');
        });
        (0, vitest_1.it)('deve adicionar código de país ao número de 9 dígitos', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.normalizePhoneNumber)('923456789')).toBe('+244923456789');
        });
        (0, vitest_1.it)('deve remover sufixo @s.whatsapp.net', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.normalizePhoneNumber)('923456789@s.whatsapp.net')).toBe('+244923456789');
        });
        (0, vitest_1.it)('deve remover sufixo @c.us', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.normalizePhoneNumber)('923456789@c.us')).toBe('+244923456789');
        });
        (0, vitest_1.it)('deve remover caracteres não numéricos', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.normalizePhoneNumber)('(923) 456-789')).toBe('+244923456789');
        });
        (0, vitest_1.it)('deve lançar erro quando número é vazio', () => {
            (0, vitest_1.expect)(() => (0, phoneNormalizer_1.normalizePhoneNumber)('')).toThrow('Número de telefone é obrigatório');
        });
        (0, vitest_1.it)('deve usar código de país customizado quando fornecido', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.normalizePhoneNumber)('912345678', '351')).toBe('+351912345678');
        });
    });
    (0, vitest_1.describe)('toWhatsAppJid', () => {
        (0, vitest_1.it)('deve converter número normalizado para JID', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.toWhatsAppJid)('+244923456789')).toBe('244923456789@s.whatsapp.net');
        });
        (0, vitest_1.it)('deve remover + do número ao criar JID', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.toWhatsAppJid)('+244923456789')).not.toContain('+');
        });
    });
    (0, vitest_1.describe)('isValidAngolaPhone', () => {
        (0, vitest_1.it)('deve validar número válido de Angola', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.isValidAngolaPhone)('+244923456789')).toBe(true);
            (0, vitest_1.expect)((0, phoneNormalizer_1.isValidAngolaPhone)('923456789')).toBe(true);
        });
        (0, vitest_1.it)('deve rejeitar número inválido de Angola', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.isValidAngolaPhone)('+244823456789')).toBe(false); // não começa com 9
            (0, vitest_1.expect)((0, phoneNormalizer_1.isValidAngolaPhone)('+24492345678')).toBe(false); // 8 dígitos
            (0, vitest_1.expect)((0, phoneNormalizer_1.isValidAngolaPhone)('+2449234567890')).toBe(false); // 10 dígitos
        });
        (0, vitest_1.it)('deve rejeitar número de outro país', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.isValidAngolaPhone)('+351912345678')).toBe(false);
        });
    });
    (0, vitest_1.describe)('extractCountryCode', () => {
        (0, vitest_1.it)('deve extrair código de país de número normalizado', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.extractCountryCode)('+244923456789')).toBe('244');
        });
        (0, vitest_1.it)('deve retornar código padrão Angola quando não consegue extrair', () => {
            (0, vitest_1.expect)((0, phoneNormalizer_1.extractCountryCode)('923456789')).toBe('244');
        });
    });
});
//# sourceMappingURL=phoneNormalizer.test.js.map