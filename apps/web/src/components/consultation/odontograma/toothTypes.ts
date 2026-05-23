/** Posição FDI no quadrante (1–8) */
export type DenteTipo = 'INCISIVO' | 'CANINO' | 'PREMOLAR' | 'MOLAR';

export function getPosicaoQuadrante(numeroDente: number): number {
  return numeroDente % 10;
}

export function getDenteTipo(numeroDente: number): DenteTipo {
  const pos = getPosicaoQuadrante(numeroDente);
  if (pos <= 2) return 'INCISIVO';
  if (pos === 3) return 'CANINO';
  if (pos <= 5) return 'PREMOLAR';
  return 'MOLAR';
}

/** Quadrantes 1 e 2 = arcada superior (raízes para cima na UI) */
export function isArcadaSuperior(numeroDente: number): boolean {
  const q = Math.floor(numeroDente / 10);
  return q === 1 || q === 2;
}
