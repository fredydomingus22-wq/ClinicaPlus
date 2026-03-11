import { EstadoAgendamento } from '@clinicaplus/types';

const ALLOWED_TRANSITIONS: Record<EstadoAgendamento, EstadoAgendamento[]> = {
  PENDENTE: ['CONFIRMADO', 'EM_PROGRESSO', 'CANCELADO', 'EM_ESPERA'] as EstadoAgendamento[],
  CONFIRMADO: ['EM_PROGRESSO', 'CANCELADO', 'NAO_COMPARECEU', 'EM_ESPERA'] as EstadoAgendamento[],
  EM_ESPERA: ['EM_PROGRESSO', 'CANCELADO', 'NAO_COMPARECEU'] as EstadoAgendamento[],
  EM_PROGRESSO: ['CONCLUIDO', 'CANCELADO'] as EstadoAgendamento[],
  CONCLUIDO: [],
  CANCELADO: [],
  NAO_COMPARECEU: [],
};

/**
 * Checks if a transition from one state to another is allowed by the business rules.
 */
export function isTransitionAllowed(
  from: EstadoAgendamento,
  to: EstadoAgendamento
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
