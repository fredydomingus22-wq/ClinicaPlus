/**
 * WebSocket Event Types
 */

export const EventNames = {
  AGENDAMENTO_CRIADO: 'agendamento/agendamento.criado',
  AGENDAMENTO_ESTADO: 'agendamento/estado.alterado',
  AGENDAMENTO_TRIAGEM: 'agendamento/triagem.solicitada',
  FATURA_EMITIDA: 'faturamento/fatura.emitida',
  NOTIFICACAO_SISTEMA: 'sistema/notificacao.enviada',
} as const;

export interface SocketEvents {
  [EventNames.AGENDAMENTO_CRIADO]: {
    agendamentoId: string;
    dataHora: string;
    pacienteNome: string;
  };
  [EventNames.AGENDAMENTO_ESTADO]: {
    agendamentoId: string;
    novoEstado: string;
    anteriorEstado: string;
  };
  [EventNames.AGENDAMENTO_TRIAGEM]: {
    agendamentoId: string;
  };
  [EventNames.FATURA_EMITIDA]: {
    faturaId: string;
    pacienteId: string;
    total: number;
  };
  [EventNames.NOTIFICACAO_SISTEMA]: {
    tipo: string;
    mensagem: string;
    link?: string;
  };
}
