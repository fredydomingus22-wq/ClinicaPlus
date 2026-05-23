import { DenteStatus, type OdontogramaMarcacao } from '@clinicaplus/types';
import { FACE_LABELS } from './constants';
import { FACE_STATUS_OPTIONS, RAIZ_STATUS_OPTIONS } from './statusOptions';

const ALL_OPTIONS = [...FACE_STATUS_OPTIONS, ...RAIZ_STATUS_OPTIONS];

export function getStatusLabel(status: DenteStatus): string {
  return ALL_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function formatMarcacaoLine(m: OdontogramaMarcacao): string {
  const face = FACE_LABELS[m.face] ?? m.face;
  return `Dente ${m.numeroDente} · ${face} · ${getStatusLabel(m.status)}`;
}

export function countMarcacoesClinicas(marcacoes: OdontogramaMarcacao[]): number {
  return marcacoes.filter((m) => m.status !== DenteStatus.SAUDAVEL).length;
}
