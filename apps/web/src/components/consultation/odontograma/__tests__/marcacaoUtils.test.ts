import { describe, it, expect } from 'vitest';
import { DenteFace, DenteStatus } from '@clinicaplus/types';
import {
  countMarcacoesClinicas,
  formatMarcacaoLine,
  getStatusLabel,
} from '../marcacaoUtils';

describe('marcacaoUtils', () => {
  it('deve formatar linha de marcação com face e status', () => {
    const line = formatMarcacaoLine({
      numeroDente: 16,
      face: DenteFace.O,
      status: DenteStatus.CARIE,
    });
    expect(line).toContain('16');
    expect(line).toContain('Oclusal');
    expect(line).toContain('Cárie');
  });

  it('deve devolver rótulo legível para status', () => {
    expect(getStatusLabel(DenteStatus.CANAL_TRATADO)).toBe('Canal tratado');
  });

  it('deve contar apenas marcações clínicas activas', () => {
    expect(
      countMarcacoesClinicas([
        { numeroDente: 11, face: DenteFace.V, status: DenteStatus.CARIE },
        { numeroDente: 12, face: DenteFace.M, status: DenteStatus.SAUDAVEL },
      ]),
    ).toBe(1);
  });
});
