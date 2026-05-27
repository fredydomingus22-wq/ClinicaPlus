/**
 * Utilitário para normalização de números de telefone para Evolution API
 *
 * Formato esperado pela Evolution API:
 * - Números internacionais: +244923456789 (com +)
 * - Números sem código de país: 923456789 (apenas dígitos)
 * - Sem sufixos do WhatsApp (@s.whatsapp.net, @c.us)
 */
/**
 * Normaliza um número de telefone para o formato da Evolution API
 * @param phone - Número de telefone em vários formatos
 * @param countryCode - Código do país (padrão: 244 para Angola)
 * @returns Número normalizado
 */
export declare function normalizePhoneNumber(phone: string, countryCode?: string): string;
/**
 * Converte número normalizado para JID do WhatsApp
 * @param normalizedPhone - Número normalizado (ex: +244923456789)
 * @returns JID formatado (ex: 244923456789@s.whatsapp.net)
 */
export declare function toWhatsAppJid(normalizedPhone: string): string;
/**
 * Valida se um número de telefone é válido para Angola
 * @param phone - Número de telefone
 * @returns true se válido
 */
export declare function isValidAngolaPhone(phone: string): boolean;
/**
 * Extrai o código de país de um número normalizado
 * @param normalizedPhone - Número normalizado
 * @returns Código do país (ex: 244)
 */
export declare function extractCountryCode(normalizedPhone: string): string;
//# sourceMappingURL=phoneNormalizer.d.ts.map