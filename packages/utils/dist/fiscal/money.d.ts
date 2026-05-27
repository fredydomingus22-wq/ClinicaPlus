/**
 * Arredonda por excesso ao cêntimo (2 casas decimais).
 * Fonte: skill AGT (`subskills/04-registar-factura.md` / `references/servico-registar-factura.md`).
 */
export declare function roundUpToCents(value: number): number;
/**
 * Arredonda por excesso quando o valor já está em cêntimos (pode conter decimais).
 * Ex.: 12.01 => 13
 */
export declare function roundUpCents(valueInCents: number): number;
//# sourceMappingURL=money.d.ts.map