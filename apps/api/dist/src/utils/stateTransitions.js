"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTransitionAllowed = isTransitionAllowed;
const ALLOWED_TRANSITIONS = {
    PENDENTE: ['CONFIRMADO', 'EM_PROGRESSO', 'CANCELADO', 'EM_ESPERA', 'ATRASADO'],
    CONFIRMADO: ['EM_PROGRESSO', 'CANCELADO', 'NAO_COMPARECEU', 'EM_ESPERA', 'ATRASADO'],
    EM_ESPERA: ['EM_PROGRESSO', 'CANCELADO', 'NAO_COMPARECEU'],
    EM_PROGRESSO: ['CONCLUIDO', 'CANCELADO'],
    ATRASADO: ['EM_PROGRESSO', 'NAO_COMPARECEU', 'CANCELADO'],
    CONCLUIDO: [],
    CANCELADO: [],
    NAO_COMPARECEU: [],
};
/**
 * Checks if a transition from one state to another is allowed by the business rules.
 */
function isTransitionAllowed(from, to) {
    return ALLOWED_TRANSITIONS[from].includes(to);
}
