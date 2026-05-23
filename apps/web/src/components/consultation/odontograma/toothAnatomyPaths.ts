/**
 * Silhuetas anatómicas por tipo FDI (viewBox 48×56).
 * Coroa junto à linha média; raízes para o exterior. Curvas suaves para leitura clínica.
 */
import type { DenteTipo } from './toothTypes';

export interface AnatomiaPaths {
  coroa: string;
  raizEsquerda?: string;
  raizDireita?: string;
  raizCentral?: string;
  canal: string;
  /** Linha cervical (decorativa, não clicável) */
  cervical?: string;
}

const SUPERIOR: Record<DenteTipo, AnatomiaPaths> = {
  INCISIVO: {
    coroa:
      'M15 31 C15 28 18 26 24 26 C30 26 33 28 33 31 C33 34 30 36 24 36 C18 36 15 34 15 31 Z',
    raizCentral:
      'M20 26 C19 22 20 12 24 8 C28 12 29 22 28 26 C27 26 21 26 20 26 Z',
    canal: 'M22.5 24 L23 14 C23.5 11 24.5 11 25 14 L25.5 24 Z',
    cervical: 'M17 29.5 L31 29.5',
  },
  CANINO: {
    coroa:
      'M16 30 C16 27 19 25 24 25 C29 25 32 27 32 30 C32 33 28 37 24 37 C20 37 16 33 16 30 Z',
    raizCentral:
      'M21 25 C20 20 22 10 24 6 C26 10 28 20 27 25 Z',
    canal: 'M23 23 L24 12 L25 23 Z',
    cervical: 'M18 28.5 L30 28.5',
  },
  PREMOLAR: {
    coroa:
      'M13 30 L35 30 C36 33 34 37 24 38 C14 37 12 33 13 30 Z',
    raizEsquerda:
      'M15 30 C14 24 15 12 18 9 C20 12 21 24 22 30 Z',
    raizDireita:
      'M26 30 C27 24 28 12 30 9 C33 12 34 24 33 30 Z',
    canal: 'M22.5 28 L23.5 16 L24.5 28 Z',
    cervical: 'M14 29 L34 29',
  },
  MOLAR: {
    coroa:
      'M11 29 L37 29 C39 33 36 39 24 40 C12 39 9 33 11 29 Z',
    raizEsquerda:
      'M13 29 C12 22 13 10 16 7 C19 10 20 22 21 29 Z',
    raizCentral:
      'M20 29 C19 18 22 8 24 5 C26 8 29 18 28 29 Z',
    raizDireita:
      'M27 29 C28 22 29 10 32 7 C35 10 36 22 35 29 Z',
    canal: 'M22 27 L24 14 L26 27 Z',
    cervical: 'M12 28.5 L36 28.5',
  },
};

const INFERIOR: Record<DenteTipo, AnatomiaPaths> = {
  INCISIVO: {
    coroa:
      'M15 17 C15 20 18 22 24 22 C30 22 33 20 33 17 C33 14 30 12 24 12 C18 12 15 14 15 17 Z',
    raizCentral:
      'M20 22 C19 26 20 44 24 48 C28 44 29 26 28 22 Z',
    canal: 'M22.5 24 L23 46 C23.5 49 24.5 49 25 46 L25.5 24 Z',
    cervical: 'M17 18.5 L31 18.5',
  },
  CANINO: {
    coroa:
      'M16 18 C16 21 19 23 24 23 C29 23 32 21 32 18 C32 15 28 11 24 11 C20 11 16 15 16 18 Z',
    raizCentral:
      'M21 23 C20 28 22 46 24 50 C26 46 28 28 27 23 Z',
    canal: 'M23 25 L24 44 L25 25 Z',
    cervical: 'M18 19.5 L30 19.5',
  },
  PREMOLAR: {
    coroa:
      'M13 18 L35 18 C36 15 34 11 24 10 C14 11 12 15 13 18 Z',
    raizEsquerda:
      'M15 18 C14 24 15 44 18 47 C20 44 21 24 22 18 Z',
    raizDireita:
      'M26 18 C27 24 28 44 30 47 C33 44 34 24 33 18 Z',
    canal: 'M22.5 20 L23.5 40 L24.5 20 Z',
    cervical: 'M14 19 L34 19',
  },
  MOLAR: {
    coroa:
      'M11 19 L37 19 C39 15 36 9 24 8 C12 9 9 15 11 19 Z',
    raizEsquerda:
      'M13 19 C12 26 13 46 16 49 C19 46 20 26 21 19 Z',
    raizCentral:
      'M20 19 C19 30 22 48 24 51 C26 48 29 30 28 19 Z',
    raizDireita:
      'M27 19 C28 26 29 46 32 49 C35 46 36 26 35 19 Z',
    canal: 'M22 21 L24 42 L26 21 Z',
    cervical: 'M12 19.5 L36 19.5',
  },
};

export function getAnatomiaPaths(tipo: DenteTipo, superior: boolean): AnatomiaPaths {
  return superior ? SUPERIOR[tipo] : INFERIOR[tipo];
}
