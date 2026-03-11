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
