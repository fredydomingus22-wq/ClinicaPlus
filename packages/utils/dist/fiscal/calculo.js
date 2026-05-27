"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcularFatura = calcularFatura;
/**
 * Calcula totais de uma fatura respeitando o regime fiscal da clínica.
 * Todos os valores em Kwanza (inteiros).
 *
 * Regras:
 * 1. Desconto é aplicado ANTES do IVA.
 * 2. Arredondamento é feito por linha (Math.round).
 * 3. Total final é a soma das linhas calculadas.
 */
function calcularFatura(itens, regimeFiscal) {
    const taxaPadrao = {
        GERAL: 14,
        SIMPLIFICADO: 7,
        EXUSA: 0,
    }[regimeFiscal];
    const itensCalculados = itens.map((item) => {
        // 1. Base bruta
        const baseItem = item.precoUnit * item.quantidade;
        // 2. Aplicar desconto sobre o total da linha antes do IVA
        const descontoItem = item.desconto ?? 0;
        const baseComDesconto = Math.max(0, baseItem - descontoItem);
        // 3. Definir taxa de IVA
        // Se o regime for SIMPLIFICADO ou EXUSA, forçamos a taxa do regime 
        // exceto se o item já vier com taxa 0 (isenção explícita).
        let taxa = item.taxaIva ?? taxaPadrao;
        if (regimeFiscal === 'SIMPLIFICADO' && taxa !== 0) {
            taxa = 7;
        }
        else if (regimeFiscal === 'EXUSA') {
            taxa = 0;
        }
        // 4. Calcular IVA (Arredondado ao Kwanza mais próximo)
        const ivaItem = Math.round(baseComDesconto * (taxa / 100));
        // 5. Total da linha
        const totalItem = baseComDesconto + ivaItem;
        return {
            ...item,
            taxaIva: taxa,
            codigoIva: taxa === 0 ? "ISE" : taxa === 7 ? "RED" : "IVA",
            base: baseComDesconto,
            iva: ivaItem,
            total: totalItem,
        };
    });
    const subtotal = itensCalculados.reduce((s, i) => s + i.base, 0);
    const totalIva = itensCalculados.reduce((s, i) => s + i.iva, 0);
    const total = subtotal + totalIva;
    const totalDesconto = itensCalculados.reduce((s, i) => s + (i.desconto ?? 0), 0);
    return {
        subtotal,
        totalDesconto,
        totalIva,
        total,
        retencaoFonte: 0,
        itensCalculados,
    };
}
//# sourceMappingURL=calculo.js.map