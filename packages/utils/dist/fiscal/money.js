"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roundUpToCents = roundUpToCents;
exports.roundUpCents = roundUpCents;
/**
 * Arredonda por excesso ao cêntimo (2 casas decimais).
 * Fonte: skill AGT (`subskills/04-registar-factura.md` / `references/servico-registar-factura.md`).
 */
function roundUpToCents(value) {
    return Math.ceil(value * 100) / 100;
}
/**
 * Arredonda por excesso quando o valor já está em cêntimos (pode conter decimais).
 * Ex.: 12.01 => 13
 */
function roundUpCents(valueInCents) {
    return Math.ceil(valueInCents);
}
//# sourceMappingURL=money.js.map