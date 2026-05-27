"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitials = getInitials;
exports.slugify = slugify;
exports.truncate = truncate;
exports.capitalize = capitalize;
/**
 * Obtém iniciais de um nome: "Carlos Silva" -> "CS"
 */
function getInitials(name) {
    if (!name)
        return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0)
        return '';
    if (parts.length === 1)
        return (parts[0] || '').substring(0, 2).toUpperCase();
    const first = parts[0] || '';
    const last = parts[parts.length - 1] || '';
    const firstChar = first[0] || '';
    const lastChar = last !== first ? (last[0] || '') : '';
    return (firstChar + lastChar).toUpperCase();
}
/**
 * Cria slug a partir de string: "Clínica Multipla" -> "clinica-multipla"
 */
function slugify(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
/**
 * Trunca string com reticências
 */
function truncate(str, max) {
    if (!str || str.length <= max)
        return str;
    return str.substring(0, max).trim() + '...';
}
/**
 * Capitaliza primeira letra
 */
function capitalize(str) {
    if (!str || str.length === 0)
        return '';
    return (str[0] || '').toUpperCase() + str.substring(1).toLowerCase();
}
//# sourceMappingURL=string.js.map