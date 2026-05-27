"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactNotFoundError = void 0;
exports.formatGreeting = formatGreeting;
class ContactNotFoundError extends Error {
    constructor(type, id) {
        super(`${type} com ID ${id} não encontrado ou sem telefone`);
        this.name = 'ContactNotFoundError';
    }
}
exports.ContactNotFoundError = ContactNotFoundError;
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
//# sourceMappingURL=contactResolver.js.map