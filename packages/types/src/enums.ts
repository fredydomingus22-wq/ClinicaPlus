import { z } from 'zod';

export enum Papel {
  PACIENTE = 'PACIENTE',
  RECEPCIONISTA = 'RECEPCIONISTA',
  MEDICO = 'MEDICO',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}
export const PapelSchema = z.nativeEnum(Papel);

export enum Plano {
  BASICO = 'BASICO',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}
export const PlanoSchema = z.nativeEnum(Plano);

export enum EstadoAgendamento {
  PENDENTE = 'PENDENTE',
  CONFIRMADO = 'CONFIRMADO',
  EM_ESPERA = 'EM_ESPERA',
  EM_PROGRESSO = 'EM_PROGRESSO',
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO',
  NAO_COMPARECEU = 'NAO_COMPARECEU'
}
export const EstadoAgendamentoSchema = z.nativeEnum(EstadoAgendamento);

export enum TipoAgendamento {
  CONSULTA = 'CONSULTA',
  EXAME = 'EXAME',
  RETORNO = 'RETORNO'
}
export const TipoAgendamentoSchema = z.nativeEnum(TipoAgendamento);

export enum TipoExame {
  LABORATORIO = 'LABORATORIO',
  IMAGEM = 'IMAGEM',
  OUTRO = 'OUTRO'
}
export const TipoExameSchema = z.nativeEnum(TipoExame);

export enum TipoDocumento {
  RECEITA = 'RECEITA',
  GUIA_EXAME = 'GUIA_EXAME',
  RELATORIO_MEDICO = 'RELATORIO_MEDICO',
  COMPROVATIVO_AGENDAMENTO = 'COMPROVATIVO_AGENDAMENTO',
  DOSSIER_CLINICO = 'DOSSIER_CLINICO'
}
export const TipoDocumentoSchema = z.nativeEnum(TipoDocumento);

export enum EstadoFatura {
  RASCUNHO = 'RASCUNHO',
  EMITIDA = 'EMITIDA',
  PAGA = 'PAGA',
  ANULADA = 'ANULADA'
}
export const EstadoFaturaSchema = z.nativeEnum(EstadoFatura);

export enum TipoFatura {
  PARTICULAR = 'PARTICULAR',
  SEGURO = 'SEGURO'
}
export const TipoFaturaSchema = z.nativeEnum(TipoFatura);

export enum MetodoPagamento {
  DINHEIRO = 'DINHEIRO',
  TRANSFERENCIA_BANCARIA = 'TRANSFERENCIA_BANCARIA',
  TPA = 'TPA',
  SEGURO = 'SEGURO'
}
export const MetodoPagamentoSchema = z.nativeEnum(MetodoPagamento);

export enum EstadoSeguro {
  PENDENTE = 'PENDENTE',
  SUBMETIDO = 'SUBMETIDO',
  APROVADO = 'APROVADO',
  REJEITADO = 'REJEITADO',
  REEMBOLSADO = 'REEMBOLSADO'
}
export const EstadoSeguroSchema = z.nativeEnum(EstadoSeguro);

export enum EscopoApiKey {
  READ_PACIENTES = 'READ_PACIENTES',
  WRITE_PACIENTES = 'WRITE_PACIENTES',
  READ_AGENDAMENTOS = 'READ_AGENDAMENTOS',
  WRITE_AGENDAMENTOS = 'WRITE_AGENDAMENTOS',
  READ_RECEITAS = 'READ_RECEITAS',
  READ_FATURAS = 'READ_FATURAS',
  WRITE_FATURAS = 'WRITE_FATURAS'
}
export const EscopoApiKeySchema = z.nativeEnum(EscopoApiKey);

export enum EventoWebhook {
  AGENDAMENTO_CRIADO = 'agendamento.criado',
  AGENDAMENTO_CONFIRMADO = 'agendamento.confirmado',
  AGENDAMENTO_CANCELADO = 'agendamento.cancelado',
  AGENDAMENTO_CONCLUIDO = 'agendamento.concluido',
  FATURA_EMITIDA = 'fatura.emitida',
  FATURA_PAGA = 'fatura.paga'
}
export const EventoWebhookSchema = z.nativeEnum(EventoWebhook);

export enum EstadoSubscricao {
  TRIAL = 'TRIAL',
  ACTIVA = 'ACTIVA',
  GRACE_PERIOD = 'GRACE_PERIOD',
  SUSPENSA = 'SUSPENSA',
  CANCELADA = 'CANCELADA'
}
export const EstadoSubscricaoSchema = z.nativeEnum(EstadoSubscricao);

export enum RazaoMudancaPlano {
  UPGRADE_MANUAL = 'UPGRADE_MANUAL',
  DOWNGRADE_MANUAL = 'DOWNGRADE_MANUAL',
  DOWNGRADE_AUTO = 'DOWNGRADE_AUTO',
  TRIAL_EXPIRADO = 'TRIAL_EXPIRADO',
  REACTIVACAO = 'REACTIVACAO',
  CORRECAO = 'CORRECAO'
}
export const RazaoMudancaPlanoSchema = z.nativeEnum(RazaoMudancaPlano);

// --- WHATSAPP ---

export enum WaEstadoInstancia {
  DESCONECTADO = 'DESCONECTADO',
  AGUARDA_QR = 'AGUARDA_QR',
  CONECTADO = 'CONECTADO',
  ERRO = 'ERRO'
}
export const WaEstadoInstanciaSchema = z.nativeEnum(WaEstadoInstancia);

export enum WaTipoAutomacao {
  MARCACAO_CONSULTA = 'MARCACAO_CONSULTA',
  LEMBRETE_24H = 'LEMBRETE_24H',
  LEMBRETE_2H = 'LEMBRETE_2H',
  CONFIRMACAO_CANCELAMENTO = 'CONFIRMACAO_CANCELAMENTO',
  BEM_VINDO = 'BEM_VINDO',
  BOAS_VINDAS = 'BOAS_VINDAS',
  LEMBRETE = 'LEMBRETE',
  FAQ = 'FAQ',
  IA_ASSISTANT = 'IA_ASSISTANT'
}
export const WaTipoAutomacaoSchema = z.nativeEnum(WaTipoAutomacao);

export enum WaEstadoConversa {
  AGUARDA_INPUT = 'AGUARDA_INPUT',
  EM_FLUXO_MARCACAO = 'EM_FLUXO_MARCACAO',
  HORARIO = 'HORARIO',
  CONFIRMAR = 'CONFIRMAR',
  AGUARDA_CONFIRMACAO = 'AGUARDA_CONFIRMACAO',
  FINALIZADA = 'FINALIZADA',
  CONCLUIDA = 'CONCLUIDA',
  ESCALADA = 'ESCALADA',
  EXPIRADA = 'EXPIRADA'
}
export const WaEstadoConversaSchema = z.nativeEnum(WaEstadoConversa);

export enum WaDirecao {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA'
}
export const WaDirecaoSchema = z.nativeEnum(WaDirecao);
