import { RegimeFiscal } from "@clinicaplus/types";

export interface ItemCalculo {
  precoUnit: number; // Kwanza inteiro
  quantidade: number;
  desconto: number; // Kwanza inteiro
  taxaIva?: number; // Override se necessário
  codigoIva?: string; // IVA | ISE | RED
  motivoIsencao?: string;
}

export interface ItemCalculado {
  descricao?: string;
  precoUnit: number;
  quantidade: number;
  desconto: number;
  taxaIva: number;
  codigoIva: string;
  base: number;
  iva: number;
  total: number;
  motivoIsencao?: string;
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
export function calcularFatura(
  itens: ItemCalculo[],
  regimeFiscal: RegimeFiscal,
): ResultadoCalculo {
  const taxaPadrao = {
    GERAL: 14,
    SIMPLIFICADO: 7,
    EXUSA: 0,
  }[regimeFiscal];

  const itensCalculados: ItemCalculado[] = itens.map((item) => {
    // 1. Base bruta
    const baseItem = item.precoUnit * item.quantidade;
    
    // 2. Aplicar desconto sobre o total da linha antes do IVA
    const descontoItem = item.desconto ?? 0;
    const baseComDesconto = Math.max(0, baseItem - descontoItem);
    
    // 3. Definir taxa de IVA
    const taxa = item.taxaIva ?? taxaPadrao;
    
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
    retencaoFonte: 0, // Implementação futura se necessário
    itensCalculados,
  };
}
