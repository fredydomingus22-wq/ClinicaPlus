"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DenteFaceSchema = exports.DenteFace = exports.DenteStatusSchema = exports.DenteStatus = exports.TipoMovimentacaoSchema = exports.TipoMovimentacao = exports.TipoProdutoSchema = exports.TipoProduto = exports.RegimeFiscalSchema = exports.RegimeFiscal = exports.TipoDocumentoFiscalSchema = exports.TipoDocumentoFiscal = exports.WaDirecaoSchema = exports.WaDirecao = exports.WaEstadoConversaSchema = exports.WaEstadoConversa = exports.WaTipoAutomacaoSchema = exports.WaTipoAutomacao = exports.WaEstadoInstanciaSchema = exports.WaEstadoInstancia = exports.RazaoMudancaPlanoSchema = exports.RazaoMudancaPlano = exports.EstadoSubscricaoSchema = exports.EstadoSubscricao = exports.EventoWebhookSchema = exports.EventoWebhook = exports.EscopoApiKeySchema = exports.EscopoApiKey = exports.EstadoSeguroSchema = exports.EstadoSeguro = exports.MetodoPagamentoSchema = exports.MetodoPagamento = exports.TipoFaturaSchema = exports.TipoFatura = exports.EstadoFaturaSchema = exports.EstadoFatura = exports.TipoDocumentoSchema = exports.TipoDocumento = exports.TipoExameSchema = exports.TipoExame = exports.TipoAgendamentoSchema = exports.TipoAgendamento = exports.EstadoAgendamentoSchema = exports.EstadoAgendamento = exports.PlanoSchema = exports.Plano = exports.PapelSchema = exports.Papel = void 0;
const zod_1 = require("zod");
var Papel;
(function (Papel) {
    Papel["PACIENTE"] = "PACIENTE";
    Papel["RECEPCIONISTA"] = "RECEPCIONISTA";
    Papel["MEDICO"] = "MEDICO";
    Papel["ADMIN"] = "ADMIN";
    Papel["SUPER_ADMIN"] = "SUPER_ADMIN";
})(Papel || (exports.Papel = Papel = {}));
exports.PapelSchema = zod_1.z.nativeEnum(Papel);
var Plano;
(function (Plano) {
    Plano["BASICO"] = "BASICO";
    Plano["PRO"] = "PRO";
    Plano["ENTERPRISE"] = "ENTERPRISE";
})(Plano || (exports.Plano = Plano = {}));
exports.PlanoSchema = zod_1.z.nativeEnum(Plano);
var EstadoAgendamento;
(function (EstadoAgendamento) {
    EstadoAgendamento["PENDENTE"] = "PENDENTE";
    EstadoAgendamento["CONFIRMADO"] = "CONFIRMADO";
    EstadoAgendamento["EM_ESPERA"] = "EM_ESPERA";
    EstadoAgendamento["EM_PROGRESSO"] = "EM_PROGRESSO";
    EstadoAgendamento["CONCLUIDO"] = "CONCLUIDO";
    EstadoAgendamento["CANCELADO"] = "CANCELADO";
    EstadoAgendamento["NAO_COMPARECEU"] = "NAO_COMPARECEU";
    EstadoAgendamento["ATRASADO"] = "ATRASADO";
})(EstadoAgendamento || (exports.EstadoAgendamento = EstadoAgendamento = {}));
exports.EstadoAgendamentoSchema = zod_1.z.nativeEnum(EstadoAgendamento);
var TipoAgendamento;
(function (TipoAgendamento) {
    TipoAgendamento["CONSULTA"] = "CONSULTA";
    TipoAgendamento["EXAME"] = "EXAME";
    TipoAgendamento["RETORNO"] = "RETORNO";
})(TipoAgendamento || (exports.TipoAgendamento = TipoAgendamento = {}));
exports.TipoAgendamentoSchema = zod_1.z.nativeEnum(TipoAgendamento);
var TipoExame;
(function (TipoExame) {
    TipoExame["LABORATORIO"] = "LABORATORIO";
    TipoExame["IMAGEM"] = "IMAGEM";
    TipoExame["OUTRO"] = "OUTRO";
})(TipoExame || (exports.TipoExame = TipoExame = {}));
exports.TipoExameSchema = zod_1.z.nativeEnum(TipoExame);
var TipoDocumento;
(function (TipoDocumento) {
    TipoDocumento["RECEITA"] = "RECEITA";
    TipoDocumento["GUIA_EXAME"] = "GUIA_EXAME";
    TipoDocumento["RELATORIO_MEDICO"] = "RELATORIO_MEDICO";
    TipoDocumento["COMPROVATIVO_AGENDAMENTO"] = "COMPROVATIVO_AGENDAMENTO";
    TipoDocumento["DOSSIER_CLINICO"] = "DOSSIER_CLINICO";
})(TipoDocumento || (exports.TipoDocumento = TipoDocumento = {}));
exports.TipoDocumentoSchema = zod_1.z.nativeEnum(TipoDocumento);
var EstadoFatura;
(function (EstadoFatura) {
    EstadoFatura["RASCUNHO"] = "RASCUNHO";
    EstadoFatura["EMITIDA"] = "EMITIDA";
    EstadoFatura["PAGA"] = "PAGA";
    EstadoFatura["ANULADA"] = "ANULADA";
})(EstadoFatura || (exports.EstadoFatura = EstadoFatura = {}));
exports.EstadoFaturaSchema = zod_1.z.nativeEnum(EstadoFatura);
var TipoFatura;
(function (TipoFatura) {
    TipoFatura["PARTICULAR"] = "PARTICULAR";
    TipoFatura["SEGURO"] = "SEGURO";
})(TipoFatura || (exports.TipoFatura = TipoFatura = {}));
exports.TipoFaturaSchema = zod_1.z.nativeEnum(TipoFatura);
var MetodoPagamento;
(function (MetodoPagamento) {
    MetodoPagamento["DINHEIRO"] = "DINHEIRO";
    MetodoPagamento["TRANSFERENCIA_BANCARIA"] = "TRANSFERENCIA_BANCARIA";
    MetodoPagamento["TPA"] = "TPA";
    MetodoPagamento["SEGURO"] = "SEGURO";
})(MetodoPagamento || (exports.MetodoPagamento = MetodoPagamento = {}));
exports.MetodoPagamentoSchema = zod_1.z.nativeEnum(MetodoPagamento);
var EstadoSeguro;
(function (EstadoSeguro) {
    EstadoSeguro["PENDENTE"] = "PENDENTE";
    EstadoSeguro["SUBMETIDO"] = "SUBMETIDO";
    EstadoSeguro["EM_ANALISE"] = "EM_ANALISE";
    EstadoSeguro["APROVADO"] = "APROVADO";
    EstadoSeguro["PARCIAL"] = "PARCIAL";
    EstadoSeguro["GLOSADO"] = "GLOSADO";
    EstadoSeguro["PAGO"] = "PAGO";
    EstadoSeguro["CANCELADO"] = "CANCELADO";
})(EstadoSeguro || (exports.EstadoSeguro = EstadoSeguro = {}));
exports.EstadoSeguroSchema = zod_1.z.nativeEnum(EstadoSeguro);
var EscopoApiKey;
(function (EscopoApiKey) {
    EscopoApiKey["READ_PACIENTES"] = "READ_PACIENTES";
    EscopoApiKey["WRITE_PACIENTES"] = "WRITE_PACIENTES";
    EscopoApiKey["READ_AGENDAMENTOS"] = "READ_AGENDAMENTOS";
    EscopoApiKey["WRITE_AGENDAMENTOS"] = "WRITE_AGENDAMENTOS";
    EscopoApiKey["READ_RECEITAS"] = "READ_RECEITAS";
    EscopoApiKey["READ_FATURAS"] = "READ_FATURAS";
    EscopoApiKey["WRITE_FATURAS"] = "WRITE_FATURAS";
})(EscopoApiKey || (exports.EscopoApiKey = EscopoApiKey = {}));
exports.EscopoApiKeySchema = zod_1.z.nativeEnum(EscopoApiKey);
var EventoWebhook;
(function (EventoWebhook) {
    EventoWebhook["AGENDAMENTO_CRIADO"] = "agendamento.criado";
    EventoWebhook["AGENDAMENTO_CONFIRMADO"] = "agendamento.confirmado";
    EventoWebhook["AGENDAMENTO_CANCELADO"] = "agendamento.cancelado";
    EventoWebhook["AGENDAMENTO_CONCLUIDO"] = "agendamento.concluido";
    EventoWebhook["FATURA_EMITIDA"] = "fatura.emitida";
    EventoWebhook["FATURA_PAGA"] = "fatura.paga";
})(EventoWebhook || (exports.EventoWebhook = EventoWebhook = {}));
exports.EventoWebhookSchema = zod_1.z.nativeEnum(EventoWebhook);
var EstadoSubscricao;
(function (EstadoSubscricao) {
    EstadoSubscricao["TRIAL"] = "TRIAL";
    EstadoSubscricao["ACTIVA"] = "ACTIVA";
    EstadoSubscricao["GRACE_PERIOD"] = "GRACE_PERIOD";
    EstadoSubscricao["SUSPENSA"] = "SUSPENSA";
    EstadoSubscricao["CANCELADA"] = "CANCELADA";
})(EstadoSubscricao || (exports.EstadoSubscricao = EstadoSubscricao = {}));
exports.EstadoSubscricaoSchema = zod_1.z.nativeEnum(EstadoSubscricao);
var RazaoMudancaPlano;
(function (RazaoMudancaPlano) {
    RazaoMudancaPlano["UPGRADE_MANUAL"] = "UPGRADE_MANUAL";
    RazaoMudancaPlano["DOWNGRADE_MANUAL"] = "DOWNGRADE_MANUAL";
    RazaoMudancaPlano["DOWNGRADE_AUTO"] = "DOWNGRADE_AUTO";
    RazaoMudancaPlano["TRIAL_EXPIRADO"] = "TRIAL_EXPIRADO";
    RazaoMudancaPlano["REACTIVACAO"] = "REACTIVACAO";
    RazaoMudancaPlano["CORRECAO"] = "CORRECAO";
})(RazaoMudancaPlano || (exports.RazaoMudancaPlano = RazaoMudancaPlano = {}));
exports.RazaoMudancaPlanoSchema = zod_1.z.nativeEnum(RazaoMudancaPlano);
// --- WHATSAPP ---
var WaEstadoInstancia;
(function (WaEstadoInstancia) {
    WaEstadoInstancia["DESCONECTADO"] = "DESCONECTADO";
    WaEstadoInstancia["AGUARDA_QR"] = "AGUARDA_QR";
    WaEstadoInstancia["CONECTADO"] = "CONECTADO";
    WaEstadoInstancia["ERRO"] = "ERRO";
})(WaEstadoInstancia || (exports.WaEstadoInstancia = WaEstadoInstancia = {}));
exports.WaEstadoInstanciaSchema = zod_1.z.nativeEnum(WaEstadoInstancia);
var WaTipoAutomacao;
(function (WaTipoAutomacao) {
    WaTipoAutomacao["MARCACAO_CONSULTA"] = "MARCACAO_CONSULTA";
    WaTipoAutomacao["LEMBRETE_24H"] = "LEMBRETE_24H";
    WaTipoAutomacao["LEMBRETE_2H"] = "LEMBRETE_2H";
    WaTipoAutomacao["CONFIRMACAO_CANCELAMENTO"] = "CONFIRMACAO_CANCELAMENTO";
    WaTipoAutomacao["BEM_VINDO"] = "BEM_VINDO";
    WaTipoAutomacao["BOAS_VINDAS"] = "BOAS_VINDAS";
    WaTipoAutomacao["LEMBRETE"] = "LEMBRETE";
    WaTipoAutomacao["FAQ"] = "FAQ";
    WaTipoAutomacao["IA_ASSISTANT"] = "IA_ASSISTANT";
})(WaTipoAutomacao || (exports.WaTipoAutomacao = WaTipoAutomacao = {}));
exports.WaTipoAutomacaoSchema = zod_1.z.nativeEnum(WaTipoAutomacao);
var WaEstadoConversa;
(function (WaEstadoConversa) {
    WaEstadoConversa["AGUARDA_INPUT"] = "AGUARDA_INPUT";
    WaEstadoConversa["EM_FLUXO_MARCACAO"] = "EM_FLUXO_MARCACAO";
    WaEstadoConversa["HORARIO"] = "HORARIO";
    WaEstadoConversa["CONFIRMAR"] = "CONFIRMAR";
    WaEstadoConversa["AGUARDA_CONFIRMACAO"] = "AGUARDA_CONFIRMACAO";
    WaEstadoConversa["FINALIZADA"] = "FINALIZADA";
    WaEstadoConversa["CONCLUIDA"] = "CONCLUIDA";
    WaEstadoConversa["ESCALADA"] = "ESCALADA";
    WaEstadoConversa["EXPIRADA"] = "EXPIRADA";
})(WaEstadoConversa || (exports.WaEstadoConversa = WaEstadoConversa = {}));
exports.WaEstadoConversaSchema = zod_1.z.nativeEnum(WaEstadoConversa);
var WaDirecao;
(function (WaDirecao) {
    WaDirecao["ENTRADA"] = "ENTRADA";
    WaDirecao["SAIDA"] = "SAIDA";
})(WaDirecao || (exports.WaDirecao = WaDirecao = {}));
exports.WaDirecaoSchema = zod_1.z.nativeEnum(WaDirecao);
var TipoDocumentoFiscal;
(function (TipoDocumentoFiscal) {
    TipoDocumentoFiscal["FA"] = "FA";
    TipoDocumentoFiscal["FT"] = "FT";
    TipoDocumentoFiscal["FR"] = "FR";
    TipoDocumentoFiscal["FG"] = "FG";
    TipoDocumentoFiscal["GF"] = "GF";
    TipoDocumentoFiscal["AC"] = "AC";
    TipoDocumentoFiscal["AR"] = "AR";
    TipoDocumentoFiscal["TV"] = "TV";
    TipoDocumentoFiscal["RC"] = "RC";
    TipoDocumentoFiscal["RG"] = "RG";
    TipoDocumentoFiscal["RE"] = "RE";
    TipoDocumentoFiscal["ND"] = "ND";
    TipoDocumentoFiscal["NC"] = "NC";
    TipoDocumentoFiscal["AF"] = "AF";
    TipoDocumentoFiscal["RP"] = "RP";
    TipoDocumentoFiscal["RA"] = "RA";
    TipoDocumentoFiscal["CS"] = "CS";
    TipoDocumentoFiscal["LD"] = "LD";
})(TipoDocumentoFiscal || (exports.TipoDocumentoFiscal = TipoDocumentoFiscal = {}));
exports.TipoDocumentoFiscalSchema = zod_1.z.nativeEnum(TipoDocumentoFiscal);
var RegimeFiscal;
(function (RegimeFiscal) {
    RegimeFiscal["GERAL"] = "GERAL";
    RegimeFiscal["SIMPLIFICADO"] = "SIMPLIFICADO";
    RegimeFiscal["EXUSA"] = "EXUSA";
})(RegimeFiscal || (exports.RegimeFiscal = RegimeFiscal = {}));
exports.RegimeFiscalSchema = zod_1.z.nativeEnum(RegimeFiscal);
// --- INVENTÁRIO ---
var TipoProduto;
(function (TipoProduto) {
    TipoProduto["PRODUTO"] = "PRODUTO";
    TipoProduto["SERVICO"] = "SERVICO";
})(TipoProduto || (exports.TipoProduto = TipoProduto = {}));
exports.TipoProdutoSchema = zod_1.z.nativeEnum(TipoProduto);
var TipoMovimentacao;
(function (TipoMovimentacao) {
    TipoMovimentacao["ENTRADA"] = "ENTRADA";
    TipoMovimentacao["SAIDA"] = "SAIDA";
    TipoMovimentacao["AJUSTE"] = "AJUSTE";
    TipoMovimentacao["VENDA"] = "VENDA";
    TipoMovimentacao["ESTORNO"] = "ESTORNO";
    TipoMovimentacao["TRANSFERENCIA"] = "TRANSFERENCIA";
})(TipoMovimentacao || (exports.TipoMovimentacao = TipoMovimentacao = {}));
exports.TipoMovimentacaoSchema = zod_1.z.nativeEnum(TipoMovimentacao);
// --- ODONTOGRAMA ---
var DenteStatus;
(function (DenteStatus) {
    DenteStatus["SAUDAVEL"] = "SAUDAVEL";
    DenteStatus["CARIE"] = "CARIE";
    DenteStatus["FRATURA"] = "FRATURA";
    DenteStatus["TRATAMENTO_CANAL"] = "TRATAMENTO_CANAL";
    DenteStatus["CANAL_TRATADO"] = "CANAL_TRATADO";
    DenteStatus["TRATADO"] = "TRATADO";
    DenteStatus["AUSENTE"] = "AUSENTE";
    DenteStatus["PROTESE"] = "PROTESE";
    DenteStatus["DESTRUICAO"] = "DESTRUICAO";
})(DenteStatus || (exports.DenteStatus = DenteStatus = {}));
exports.DenteStatusSchema = zod_1.z.nativeEnum(DenteStatus);
var DenteFace;
(function (DenteFace) {
    DenteFace["V"] = "V";
    DenteFace["L"] = "L";
    DenteFace["M"] = "M";
    DenteFace["D"] = "D";
    DenteFace["O"] = "O";
    DenteFace["G"] = "G";
    /** Raiz / canal (camada anatómica) */
    DenteFace["R"] = "R";
})(DenteFace || (exports.DenteFace = DenteFace = {}));
exports.DenteFaceSchema = zod_1.z.nativeEnum(DenteFace);
//# sourceMappingURL=enums.js.map