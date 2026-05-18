import { describe, it, expect } from 'vitest';
import { calcularFatura } from '@clinicaplus/utils';

// ─── Passo I6 — Testes Unitários do Motor de Cálculo Fiscal ───────────────────
// 5 testes obrigatórios conforme PROMPTS-14-faturacao.md:
//   1. GERAL (IVA 14%)
//   2. SIMPLIFICADO (IVA 7%)
//   3. ISENTO/EXUSA (IVA 0%, com motivo de isenção)
//   4. Arredondamento por linha (sem floats residuais)
//   5. Desconto aplicado ANTES do IVA

describe('Motor de Cálculo Fiscal (calcularFatura)', () => {
  // ─── Teste 1: Regime Geral — IVA 14% ──────────────────────────────────────
  it('aplica IVA 14% no regime GERAL', () => {
    // Consulta: 10.000 Kz × 1 = 10.000 base
    // IVA: Math.round(10.000 * 0.14) = 1.400
    // Total: 11.400 Kz
    const resultado = calcularFatura(
      [{ precoUnit: 10_000, quantidade: 1, desconto: 0 }],
      'GERAL' as any,
    );

    expect(resultado.subtotal).toBe(10_000);
    expect(resultado.totalIva).toBe(1_400);
    expect(resultado.total).toBe(11_400);
    expect(resultado.itensCalculados[0]!.codigoIva).toBe('IVA');
    expect(resultado.itensCalculados[0]!.taxaIva).toBe(14);
  });

  // ─── Teste 2: Regime Simplificado — IVA 7% ────────────────────────────────
  it('aplica IVA 7% no regime SIMPLIFICADO', () => {
    // Consulta: 5.000 Kz × 2 = 10.000 base
    // IVA: Math.round(10.000 * 0.07) = 700
    // Total: 10.700 Kz
    const resultado = calcularFatura(
      [{ precoUnit: 5_000, quantidade: 2, desconto: 0 }],
      'SIMPLIFICADO' as any,
    );

    expect(resultado.subtotal).toBe(10_000);
    expect(resultado.totalIva).toBe(700);
    expect(resultado.total).toBe(10_700);
    expect(resultado.itensCalculados[0]!.codigoIva).toBe('RED');
    expect(resultado.itensCalculados[0]!.taxaIva).toBe(7);
  });

  // ─── Teste 3: Regime EXUSA — IVA 0%, com motivo de isenção ───────────────
  it('aplica IVA 0% no regime EXUSA (isento) e atribui código ISE', () => {
    // Artigo 21º do CIVA — isenção
    // Total = base, sem IVA
    const resultado = calcularFatura(
      [
        {
          precoUnit: 8_000,
          quantidade: 1,
          desconto: 0,
          motivoIsencao: 'Artigo 21.º do CIVA — Prestação de serviços médicos',
        },
      ],
      'EXUSA' as any,
    );

    expect(resultado.totalIva).toBe(0);
    expect(resultado.total).toBe(8_000);
    expect(resultado.itensCalculados[0]!.codigoIva).toBe('ISE');
    expect(resultado.itensCalculados[0]!.taxaIva).toBe(0);
    expect(resultado.itensCalculados[0]!.motivoIsencao).toContain('Artigo 21');
  });

  // ─── Teste 4: Arredondamento por linha — sem floats residuais ─────────────
  it('arredonda IVA por linha sem deixar valores em float (Kwanza inteiro)', () => {
    // 3.000 × 0.14 = 420.0 — exato
    // 1.500 × 0.14 = 210.0 — exato
    // 1.111 × 0.14 = 155.54 → Math.round = 156
    const resultado = calcularFatura(
      [
        { precoUnit: 3_000, quantidade: 1, desconto: 0 },
        { precoUnit: 1_500, quantidade: 1, desconto: 0 },
        { precoUnit: 1_111, quantidade: 1, desconto: 0 },
      ],
      'GERAL' as any,
    );

    // Verificar que todos os valores IVA são inteiros (sem decimais)
    for (const item of resultado.itensCalculados) {
      expect(Number.isInteger(item.iva)).toBe(true);
      expect(Number.isInteger(item.total)).toBe(true);
    }

    // IVA: 420 + 210 + Math.round(155.54) = 420 + 210 + 156 = 786
    expect(resultado.totalIva).toBe(786);
    expect(Number.isInteger(resultado.total)).toBe(true);
  });

  // ─── Teste 5: Desconto aplicado ANTES do IVA ──────────────────────────────
  it('aplica desconto sobre a base ANTES de calcular o IVA', () => {
    // Consulta: 10.000 Kz, desconto: 2.000 Kz
    // Base com desconto: 10.000 - 2.000 = 8.000 Kz
    // IVA sobre 8.000: Math.round(8.000 * 0.14) = 1.120 Kz
    // Total: 8.000 + 1.120 = 9.120 Kz
    //
    // ERRADO (desconto após IVA): 10.000 + 1.400 - 2.000 = 9.400 Kz ← não deve acontecer
    const resultado = calcularFatura(
      [{ precoUnit: 10_000, quantidade: 1, desconto: 2_000 }],
      'GERAL' as any,
    );

    expect(resultado.itensCalculados[0]!.base).toBe(8_000);
    expect(resultado.itensCalculados[0]!.iva).toBe(1_120);
    expect(resultado.itensCalculados[0]!.total).toBe(9_120);
    expect(resultado.total).toBe(9_120);
    expect(resultado.totalDesconto).toBe(2_000);

    // Confirmar que NÃO usou a abordagem errada
    expect(resultado.total).not.toBe(9_400);
  });
});
