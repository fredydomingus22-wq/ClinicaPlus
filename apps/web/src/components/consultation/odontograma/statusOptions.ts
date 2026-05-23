import { DenteFace, DenteStatus } from '@clinicaplus/types';
import { isRaizFace } from './odontogramaColors';

export interface StatusOption {
  value: DenteStatus;
  label: string;
  chipClass: string;
}

export const FACE_STATUS_OPTIONS: StatusOption[] = [
  { value: DenteStatus.CARIE, label: 'Cárie', chipClass: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200' },
  { value: DenteStatus.FRATURA, label: 'Fratura', chipClass: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
  { value: DenteStatus.TRATADO, label: 'Restauração OK', chipClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' },
  { value: DenteStatus.PROTESE, label: 'Prótese / Coroa', chipClass: 'bg-neutral-200 text-neutral-800 border-neutral-400 hover:bg-neutral-300' },
  { value: DenteStatus.DESTRUICAO, label: 'Destruição coronária', chipClass: 'bg-neutral-300 text-neutral-900 border-neutral-500 hover:bg-neutral-400' },
  { value: DenteStatus.AUSENTE, label: 'Ausente', chipClass: 'bg-red-200 text-red-900 border-red-300 hover:bg-red-300' },
  { value: DenteStatus.SAUDAVEL, label: 'Limpar face', chipClass: 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50' },
];

export const RAIZ_STATUS_OPTIONS: StatusOption[] = [
  { value: DenteStatus.TRATAMENTO_CANAL, label: 'Canal necessário', chipClass: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200' },
  { value: DenteStatus.CANAL_TRATADO, label: 'Canal tratado', chipClass: 'bg-orange-100 text-orange-900 border-orange-300 hover:bg-orange-200' },
  { value: DenteStatus.FRATURA, label: 'Fratura radicular', chipClass: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
  { value: DenteStatus.AUSENTE, label: 'Extraído', chipClass: 'bg-neutral-400 text-white border-neutral-600 hover:bg-neutral-500' },
  { value: DenteStatus.SAUDAVEL, label: 'Limpar', chipClass: 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50' },
];

export function getStatusOptionsForFace(face: DenteFace): StatusOption[] {
  return isRaizFace(face) ? RAIZ_STATUS_OPTIONS : FACE_STATUS_OPTIONS;
}
