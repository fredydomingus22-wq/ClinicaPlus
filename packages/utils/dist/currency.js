"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatKwanza = formatKwanza;
exports.parseKwanza = parseKwanza;
/**
 * Formata valor inteiro de Kwanza para string: "5.000 Kz"
 */
function formatKwanza(amount) {
    return new Intl.NumberFormat('pt-AO', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount) + ' Kz';
}
/**
 * Converte string de Kwanza para número
 */
function parseKwanza(str) {
    const normalized = str.replace(/[^\d]/g, '');
    return parseInt(normalized || '0', 10);
}
//# sourceMappingURL=currency.js.map