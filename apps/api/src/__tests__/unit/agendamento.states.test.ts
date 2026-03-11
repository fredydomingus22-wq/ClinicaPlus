import { describe, it, expect } from 'vitest';
import { isTransitionAllowed } from '../../utils/stateTransitions';
import { EstadoAgendamento } from '@clinicaplus/types';

describe('stateTransitions', () => {
  describe('isTransitionAllowed', () => {
    // PENDENTE
    it('allows PENDENTE -> CONFIRMADO', () => {
      expect(isTransitionAllowed(EstadoAgendamento.PENDENTE, EstadoAgendamento.CONFIRMADO)).toBe(true);
    });
    
    it('allows PENDENTE -> CANCELADO', () => {
      expect(isTransitionAllowed(EstadoAgendamento.PENDENTE, EstadoAgendamento.CANCELADO)).toBe(true);
    });

    it('blocks PENDENTE -> CONCLUIDO', () => {
      expect(isTransitionAllowed(EstadoAgendamento.PENDENTE, EstadoAgendamento.CONCLUIDO)).toBe(false);
    });

    // CONFIRMADO
    it('allows CONFIRMADO -> EM_PROGRESSO', () => {
      expect(isTransitionAllowed(EstadoAgendamento.CONFIRMADO, EstadoAgendamento.EM_PROGRESSO)).toBe(true);
    });

    it('allows CONFIRMADO -> NAO_COMPARECEU', () => {
      expect(isTransitionAllowed(EstadoAgendamento.CONFIRMADO, EstadoAgendamento.NAO_COMPARECEU)).toBe(true);
    });

    it('blocks CONFIRMADO -> CONCLUIDO', () => {
      expect(isTransitionAllowed(EstadoAgendamento.CONFIRMADO, EstadoAgendamento.CONCLUIDO)).toBe(false);
    });

    // EM_PROGRESSO
    it('allows EM_PROGRESSO -> CONCLUIDO', () => {
      expect(isTransitionAllowed(EstadoAgendamento.EM_PROGRESSO, EstadoAgendamento.CONCLUIDO)).toBe(true);
    });

    it('allows EM_PROGRESSO -> CANCELADO', () => {
      expect(isTransitionAllowed(EstadoAgendamento.EM_PROGRESSO, EstadoAgendamento.CANCELADO)).toBe(true);
    });

    // CONCLUIDO (terminal)
    it('blocks CONCLUIDO -> PENDENTE', () => {
      expect(isTransitionAllowed(EstadoAgendamento.CONCLUIDO, EstadoAgendamento.PENDENTE)).toBe(false);
    });

    // CANCELADO (terminal)
    it('blocks CANCELADO -> CONFIRMADO', () => {
      expect(isTransitionAllowed(EstadoAgendamento.CANCELADO, EstadoAgendamento.CONFIRMADO)).toBe(false);
    });

    // NAO_COMPARECEU (terminal)
    it('blocks NAO_COMPARECEU -> EM_PROGRESSO', () => {
      expect(isTransitionAllowed(EstadoAgendamento.NAO_COMPARECEU, EstadoAgendamento.EM_PROGRESSO)).toBe(false);
    });
  });
});
