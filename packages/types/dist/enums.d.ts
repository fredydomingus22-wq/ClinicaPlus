import { z } from 'zod';
export declare enum Papel {
    PACIENTE = "PACIENTE",
    RECEPCIONISTA = "RECEPCIONISTA",
    MEDICO = "MEDICO",
    ADMIN = "ADMIN",
    SUPER_ADMIN = "SUPER_ADMIN"
}
export declare const PapelSchema: z.ZodNativeEnum<typeof Papel>;
export declare enum Plano {
    BASICO = "BASICO",
    PRO = "PRO",
    ENTERPRISE = "ENTERPRISE"
}
export declare const PlanoSchema: z.ZodNativeEnum<typeof Plano>;
export declare enum EstadoAgendamento {
    PENDENTE = "PENDENTE",
    CONFIRMADO = "CONFIRMADO",
    EM_ESPERA = "EM_ESPERA",
    EM_PROGRESSO = "EM_PROGRESSO",
    CONCLUIDO = "CONCLUIDO",
    CANCELADO = "CANCELADO",
    NAO_COMPARECEU = "NAO_COMPARECEU",
    ATRASADO = "ATRASADO"
}
export declare const EstadoAgendamentoSchema: z.ZodNativeEnum<typeof EstadoAgendamento>;
export declare enum TipoAgendamento {
    CONSULTA = "CONSULTA",
    EXAME = "EXAME",
    RETORNO = "RETORNO"
}
export declare const TipoAgendamentoSchema: z.ZodNativeEnum<typeof TipoAgendamento>;
export declare enum TipoExame {
    LABORATORIO = "LABORATORIO",
    IMAGEM = "IMAGEM",
    OUTRO = "OUTRO"
}
export declare const TipoExameSchema: z.ZodNativeEnum<typeof TipoExame>;
export declare enum TipoDocumento {
    RECEITA = "RECEITA",
    GUIA_EXAME = "GUIA_EXAME",
    RELATORIO_MEDICO = "RELATORIO_MEDICO",
    COMPROVATIVO_AGENDAMENTO = "COMPROVATIVO_AGENDAMENTO",
    DOSSIER_CLINICO = "DOSSIER_CLINICO"
}
export declare const TipoDocumentoSchema: z.ZodNativeEnum<typeof TipoDocumento>;
export declare enum EstadoFatura {
    RASCUNHO = "RASCUNHO",
    EMITIDA = "EMITIDA",
    PAGA = "PAGA",
    ANULADA = "ANULADA"
}
export declare const EstadoFaturaSchema: z.ZodNativeEnum<typeof EstadoFatura>;
export declare enum TipoFatura {
    PARTICULAR = "PARTICULAR",
    SEGURO = "SEGURO"
}
export declare const TipoFaturaSchema: z.ZodNativeEnum<typeof TipoFatura>;
export declare enum MetodoPagamento {
    DINHEIRO = "DINHEIRO",
    TRANSFERENCIA_BANCARIA = "TRANSFERENCIA_BANCARIA",
    TPA = "TPA",
    SEGURO = "SEGURO"
}
export declare const MetodoPagamentoSchema: z.ZodNativeEnum<typeof MetodoPagamento>;
export declare enum EstadoSeguro {
    PENDENTE = "PENDENTE",
    SUBMETIDO = "SUBMETIDO",
    EM_ANALISE = "EM_ANALISE",
    APROVADO = "APROVADO",
    PARCIAL = "PARCIAL",
    GLOSADO = "GLOSADO",
    PAGO = "PAGO",
    CANCELADO = "CANCELADO"
}
export declare const EstadoSeguroSchema: z.ZodNativeEnum<typeof EstadoSeguro>;
export declare enum EscopoApiKey {
    READ_PACIENTES = "READ_PACIENTES",
    WRITE_PACIENTES = "WRITE_PACIENTES",
    READ_AGENDAMENTOS = "READ_AGENDAMENTOS",
    WRITE_AGENDAMENTOS = "WRITE_AGENDAMENTOS",
    READ_RECEITAS = "READ_RECEITAS",
    READ_FATURAS = "READ_FATURAS",
    WRITE_FATURAS = "WRITE_FATURAS"
}
export declare const EscopoApiKeySchema: z.ZodNativeEnum<typeof EscopoApiKey>;
export declare enum EventoWebhook {
    AGENDAMENTO_CRIADO = "agendamento.criado",
    AGENDAMENTO_CONFIRMADO = "agendamento.confirmado",
    AGENDAMENTO_CANCELADO = "agendamento.cancelado",
    AGENDAMENTO_CONCLUIDO = "agendamento.concluido",
    FATURA_EMITIDA = "fatura.emitida",
    FATURA_PAGA = "fatura.paga"
}
export declare const EventoWebhookSchema: z.ZodNativeEnum<typeof EventoWebhook>;
export declare enum EstadoSubscricao {
    TRIAL = "TRIAL",
    ACTIVA = "ACTIVA",
    GRACE_PERIOD = "GRACE_PERIOD",
    SUSPENSA = "SUSPENSA",
    CANCELADA = "CANCELADA"
}
export declare const EstadoSubscricaoSchema: z.ZodNativeEnum<typeof EstadoSubscricao>;
export declare enum RazaoMudancaPlano {
    UPGRADE_MANUAL = "UPGRADE_MANUAL",
    DOWNGRADE_MANUAL = "DOWNGRADE_MANUAL",
    DOWNGRADE_AUTO = "DOWNGRADE_AUTO",
    TRIAL_EXPIRADO = "TRIAL_EXPIRADO",
    REACTIVACAO = "REACTIVACAO",
    CORRECAO = "CORRECAO"
}
export declare const RazaoMudancaPlanoSchema: z.ZodNativeEnum<typeof RazaoMudancaPlano>;
export declare enum WaEstadoInstancia {
    DESCONECTADO = "DESCONECTADO",
    AGUARDA_QR = "AGUARDA_QR",
    CONECTADO = "CONECTADO",
    ERRO = "ERRO"
}
export declare const WaEstadoInstanciaSchema: z.ZodNativeEnum<typeof WaEstadoInstancia>;
export declare enum WaTipoAutomacao {
    MARCACAO_CONSULTA = "MARCACAO_CONSULTA",
    LEMBRETE_24H = "LEMBRETE_24H",
    LEMBRETE_2H = "LEMBRETE_2H",
    CONFIRMACAO_CANCELAMENTO = "CONFIRMACAO_CANCELAMENTO",
    BEM_VINDO = "BEM_VINDO",
    BOAS_VINDAS = "BOAS_VINDAS",
    LEMBRETE = "LEMBRETE",
    FAQ = "FAQ",
    IA_ASSISTANT = "IA_ASSISTANT"
}
export declare const WaTipoAutomacaoSchema: z.ZodNativeEnum<typeof WaTipoAutomacao>;
export declare enum WaEstadoConversa {
    AGUARDA_INPUT = "AGUARDA_INPUT",
    EM_FLUXO_MARCACAO = "EM_FLUXO_MARCACAO",
    HORARIO = "HORARIO",
    CONFIRMAR = "CONFIRMAR",
    AGUARDA_CONFIRMACAO = "AGUARDA_CONFIRMACAO",
    FINALIZADA = "FINALIZADA",
    CONCLUIDA = "CONCLUIDA",
    ESCALADA = "ESCALADA",
    EXPIRADA = "EXPIRADA"
}
export declare const WaEstadoConversaSchema: z.ZodNativeEnum<typeof WaEstadoConversa>;
export declare enum WaDirecao {
    ENTRADA = "ENTRADA",
    SAIDA = "SAIDA"
}
export declare const WaDirecaoSchema: z.ZodNativeEnum<typeof WaDirecao>;
export declare enum TipoDocumentoFiscal {
    FA = "FA",
    FT = "FT",
    FR = "FR",
    FG = "FG",
    GF = "GF",
    AC = "AC",
    AR = "AR",
    TV = "TV",
    RC = "RC",
    RG = "RG",
    RE = "RE",
    ND = "ND",
    NC = "NC",
    AF = "AF",
    RP = "RP",
    RA = "RA",
    CS = "CS",
    LD = "LD"
}
export declare const TipoDocumentoFiscalSchema: z.ZodNativeEnum<typeof TipoDocumentoFiscal>;
export declare enum RegimeFiscal {
    GERAL = "GERAL",
    SIMPLIFICADO = "SIMPLIFICADO",
    EXUSA = "EXUSA"
}
export declare const RegimeFiscalSchema: z.ZodNativeEnum<typeof RegimeFiscal>;
export declare enum TipoProduto {
    PRODUTO = "PRODUTO",
    SERVICO = "SERVICO"
}
export declare const TipoProdutoSchema: z.ZodNativeEnum<typeof TipoProduto>;
export declare enum TipoMovimentacao {
    ENTRADA = "ENTRADA",
    SAIDA = "SAIDA",
    AJUSTE = "AJUSTE",
    VENDA = "VENDA",
    ESTORNO = "ESTORNO",
    TRANSFERENCIA = "TRANSFERENCIA"
}
export declare const TipoMovimentacaoSchema: z.ZodNativeEnum<typeof TipoMovimentacao>;
export declare enum DenteStatus {
    SAUDAVEL = "SAUDAVEL",
    CARIE = "CARIE",
    FRATURA = "FRATURA",
    TRATAMENTO_CANAL = "TRATAMENTO_CANAL",
    CANAL_TRATADO = "CANAL_TRATADO",
    TRATADO = "TRATADO",
    AUSENTE = "AUSENTE",
    PROTESE = "PROTESE",
    DESTRUICAO = "DESTRUICAO"
}
export declare const DenteStatusSchema: z.ZodNativeEnum<typeof DenteStatus>;
export declare enum DenteFace {
    V = "V",
    L = "L",
    M = "M",
    D = "D",
    O = "O",
    G = "G",
    /** Raiz / canal (camada anatómica) */
    R = "R"
}
export declare const DenteFaceSchema: z.ZodNativeEnum<typeof DenteFace>;
//# sourceMappingURL=enums.d.ts.map