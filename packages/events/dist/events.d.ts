/**
 * WebSocket Event Types
 */
export declare const EventNames: {
    readonly AGENDAMENTO_CRIADO: "agendamento/agendamento.criado";
    readonly AGENDAMENTO_ESTADO: "agendamento/estado.alterado";
    readonly AGENDAMENTO_TRIAGEM: "agendamento/triagem.solicitada";
    readonly FATURA_EMITIDA: "faturamento/fatura.emitida";
    readonly NOTIFICACAO_SISTEMA: "sistema/notificacao.enviada";
};
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
