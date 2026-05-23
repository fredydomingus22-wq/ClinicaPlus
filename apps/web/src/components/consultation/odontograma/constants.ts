/** Dentes permanentes FDI — 32 dentes adulto */
export const FDI_QUADRANT_1 = [18, 17, 16, 15, 14, 13, 12, 11] as const;
export const FDI_QUADRANT_2 = [21, 22, 23, 24, 25, 26, 27, 28] as const;
export const FDI_QUADRANT_3 = [38, 37, 36, 35, 34, 33, 32, 31] as const;
export const FDI_QUADRANT_4 = [41, 42, 43, 44, 45, 46, 47, 48] as const;

export const FDI_ALL_ADULT = [
  ...FDI_QUADRANT_1,
  ...FDI_QUADRANT_2,
  ...FDI_QUADRANT_3,
  ...FDI_QUADRANT_4,
] as const;

export const FACE_LABELS: Record<string, string> = {
  V: 'Vestibular',
  L: 'Lingual / Palatina',
  M: 'Mesial',
  D: 'Distal',
  O: 'Oclusal / Incisal',
  G: 'Coroa (anatomia)',
  R: 'Raiz / Canal',
};
