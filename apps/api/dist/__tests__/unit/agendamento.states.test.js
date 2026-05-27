"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const stateTransitions_1 = require("../../utils/stateTransitions");
const types_1 = require("@clinicaplus/types");
(0, vitest_1.describe)('stateTransitions', () => {
    (0, vitest_1.describe)('isTransitionAllowed', () => {
        // PENDENTE
        (0, vitest_1.it)('allows PENDENTE -> CONFIRMADO', () => {
            (0, vitest_1.expect)((0, stateTransitions_1.isTransitionAllowed)(types_1.EstadoAgendamento.PENDENTE, types_1.EstadoAgendamento.CONFIRMADO)).toBe(true);
        });
        (0, vitest_1.it)('allows PENDENTE -> CANCELADO', () => {
            (0, vitest_1.expect)((0, stateTransitions_1.isTransitionAllowed)(types_1.EstadoAgendamento.PENDENTE, types_1.EstadoAgendamento.CANCELADO)).toBe(true);
        });
        (0, vitest_1.it)('blocks PENDENTE -> CONCLUIDO', () => {
            (0, vitest_1.expect)((0, stateTransitions_1.isTransitionAllowed)(types_1.EstadoAgendamento.PENDENTE, types_1.EstadoAgendamento.CONCLUIDO)).toBe(false);
        });
        // CONFIRMADO
        (0, vitest_1.it)('allows CONFIRMADO -> EM_PROGRESSO', () => {
            (0, vitest_1.expect)((0, stateTransitions_1.isTransitionAllowed)(types_1.EstadoAgendamento.CONFIRMADO, types_1.EstadoAgendamento.EM_PROGRESSO)).toBe(true);
        });
        (0, vitest_1.it)('allows CONFIRMADO -> NAO_COMPARECEU', () => {
            (0, vitest_1.expect)((0, stateTransitions_1.isTransitionAllowed)(types_1.EstadoAgendamento.CONFIRMADO, types_1.EstadoAgendamento.NAO_COMPARECEU)).toBe(true);
        });
        (0, vitest_1.it)('blocks CONFIRMADO -> CONCLUIDO', () => {
            (0, vitest_1.expect)((0, stateTransitions_1.isTransitionAllowed)(types_1.EstadoAgendamento.CONFIRMADO, types_1.EstadoAgendamento.CONCLUIDO)).toBe(false);
        });
        // EM_PROGRESSO
        (0, vitest_1.it)('allows EM_PROGRESSO -> CONCLUIDO', () => {
            (0, vitest_1.expect)((0, stateTransitions_1.isTransitionAllowed)(types_1.EstadoAgendamento.EM_PROGRESSO, types_1.EstadoAgendamento.CONCLUIDO)).toBe(true);
        });
        (0, vitest_1.it)('allows EM_PROGRESSO -> CANCELADO', () => {
            (0, vitest_1.expect)((0, stateTransitions_1.isTransitionAllowed)(types_1.EstadoAgendamento.EM_PROGRESSO, types_1.EstadoAgendamento.CANCELADO)).toBe(true);
        });
        // CONCLUIDO (terminal)
        (0, vitest_1.it)('blocks CONCLUIDO -> PENDENTE', () => {
            (0, vitest_1.expect)((0, stateTransitions_1.isTransitionAllowed)(types_1.EstadoAgendamento.CONCLUIDO, types_1.EstadoAgendamento.PENDENTE)).toBe(false);
        });
        // CANCELADO (terminal)
        (0, vitest_1.it)('blocks CANCELADO -> CONFIRMADO', () => {
            (0, vitest_1.expect)((0, stateTransitions_1.isTransitionAllowed)(types_1.EstadoAgendamento.CANCELADO, types_1.EstadoAgendamento.CONFIRMADO)).toBe(false);
        });
        // NAO_COMPARECEU (terminal)
        (0, vitest_1.it)('blocks NAO_COMPARECEU -> EM_PROGRESSO', () => {
            (0, vitest_1.expect)((0, stateTransitions_1.isTransitionAllowed)(types_1.EstadoAgendamento.NAO_COMPARECEU, types_1.EstadoAgendamento.EM_PROGRESSO)).toBe(false);
        });
    });
});
