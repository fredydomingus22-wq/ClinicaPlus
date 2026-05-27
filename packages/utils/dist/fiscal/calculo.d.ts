export interface ItemCalculo {
    precoUnit: number;
    quantidade: number;
    desconto: number;
    taxaIva?: number | undefined;
    codigoIva?: string | undefined;
    motivoIsencao?: string | undefined;
}
export interface ItemCalculado {
    descricao?: string | undefined;
    precoUnit: number;
    quantidade: number;
    desconto: number;
    taxaIva: number;
    codigoIva: string;
    base: number;
    iva: number;
    total: number;
    motivoIsencao?: string | undefined;
}
export interface ResultadoCalculo {
    subtotal: number;
    totalDesconto: number;
    totalIva: number;
    total: number;
    retencaoFonte: number;
    itensCalculados: ItemCalculado[];
}
/**
 * Calcula totais de uma fatura respeitando o regime fiscal da clínica.
 * Todos os valores em Kwanza (inteiros).
 *
 * Regras:
 * 1. Desconto é aplicado ANTES do IVA.
 * 2. Arredondamento é feito por linha (Math.round).
 * 3. Total final é a soma das linhas calculadas.
 */
export declare function calcularFatura(itens: ItemCalculo[], regimeFiscal: 'GERAL' | 'SIMPLIFICADO' | 'EXUSA'): ResultadoCalculo;
//# sourceMappingURL=calculo.d.ts.map