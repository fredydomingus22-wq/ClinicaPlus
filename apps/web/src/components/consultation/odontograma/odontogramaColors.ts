import { DenteFace, DenteStatus } from '@clinicaplus/types';

const PROBLEM_STATUSES: DenteStatus[] = [
  DenteStatus.CARIE,
  DenteStatus.FRATURA,
  DenteStatus.TRATAMENTO_CANAL,
  DenteStatus.AUSENTE,
  DenteStatus.DESTRUICAO,
];

const TREATED_STATUSES: DenteStatus[] = [
  DenteStatus.TRATADO,
  DenteStatus.SAUDAVEL,
  DenteStatus.CANAL_TRATADO,
];

const PROTESE_STATUSES: DenteStatus[] = [DenteStatus.PROTESE];

const BASE_INTERACTIVE =
  'stroke-neutral-500 stroke-[0.6] transition-colors duration-150';

export function fillClassForStatus(
  status: DenteStatus | undefined,
  face?: DenteFace,
): string {
  if (!status || status === DenteStatus.SAUDAVEL) {
    return `fill-white ${BASE_INTERACTIVE} ${!face ? '' : 'hover:fill-neutral-100'}`;
  }
  if (status === DenteStatus.CANAL_TRATADO) {
    return `fill-orange-400 ${BASE_INTERACTIVE} hover:fill-orange-500 stroke-orange-700`;
  }
  if (status === DenteStatus.TRATAMENTO_CANAL && face === DenteFace.R) {
    return `fill-red-500 ${BASE_INTERACTIVE} hover:fill-red-600 stroke-red-800`;
  }
  if (PROBLEM_STATUSES.includes(status)) {
    return `fill-red-400 ${BASE_INTERACTIVE} hover:fill-red-500 stroke-red-700`;
  }
  if (PROTESE_STATUSES.includes(status)) {
    return `fill-neutral-500 ${BASE_INTERACTIVE} hover:fill-neutral-600 stroke-neutral-800`;
  }
  if (TREATED_STATUSES.includes(status)) {
    return `fill-emerald-300 ${BASE_INTERACTIVE} hover:fill-emerald-400 stroke-emerald-700`;
  }
  return `fill-white ${BASE_INTERACTIVE}`;
}

export function isRaizFace(face: DenteFace): boolean {
  return face === DenteFace.R;
}
