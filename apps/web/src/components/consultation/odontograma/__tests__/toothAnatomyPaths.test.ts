import { describe, it, expect } from 'vitest';
import { getAnatomiaPaths } from '../toothAnatomyPaths';
import type { DenteTipo } from '../toothTypes';

const TIPOS: DenteTipo[] = ['INCISIVO', 'CANINO', 'PREMOLAR', 'MOLAR'];

describe('toothAnatomyPaths', () => {
  it('deve expor coroa, canal e linha cervical para todos os tipos', () => {
    for (const tipo of TIPOS) {
      const sup = getAnatomiaPaths(tipo, true);
      const inf = getAnatomiaPaths(tipo, false);
      expect(sup.coroa.length).toBeGreaterThan(10);
      expect(sup.canal.length).toBeGreaterThan(5);
      expect(sup.cervical).toBeTruthy();
      expect(inf.cervical).toBeTruthy();
    }
  });

  it('molares devem ter três raízes na arcada superior', () => {
    const molar = getAnatomiaPaths('MOLAR', true);
    expect(molar.raizEsquerda).toBeTruthy();
    expect(molar.raizCentral).toBeTruthy();
    expect(molar.raizDireita).toBeTruthy();
  });
});
