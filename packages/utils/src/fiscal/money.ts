/**
 * Arredonda por excesso ao cêntimo (2 casas decimais).
 * Fonte: skill AGT (`subskills/04-registar-factura.md` / `references/servico-registar-factura.md`).
 */
export function roundUpToCents(value: number): number {
  return Math.ceil(value * 100) / 100;
}

/**
 * Arredonda por excesso quando o valor já está em cêntimos (pode conter decimais).
 * Ex.: 12.01 => 13
 */
export function roundUpCents(valueInCents: number): number {
  return Math.ceil(valueInCents);
}
