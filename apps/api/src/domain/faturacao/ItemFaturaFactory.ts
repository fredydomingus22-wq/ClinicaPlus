import { TipoItemFatura } from '@clinicaplus/types';

export class ItemFaturaFactory {
  static criarFromProduto(
    produto: any,
    quantidade: number,
    precoOverride?: number
  ) {
    const precoUnit = precoOverride ?? produto.precoVenda;
    
    return {
      tipoItem: TipoItemFatura.PRODUTO,
      produtoId: produto.id,
      descricao: produto.nome,
      quantidade,
      precoUnit,
      desconto: 0,
      taxaIva: produto.taxaIva,
      codigoIva: produto.codigoIva,
      motivoIsencao: produto.motivoIsencao,
      total: precoUnit * quantidade,
    };
  }

  static criarFromTratamento(
    tratamento: any,
    quantidade: number,
    precoOverride?: number
  ) {
    const precoUnit = precoOverride ?? tratamento.preco;
    
    return {
      tipoItem: TipoItemFatura.TRATAMENTO,
      tratamentoId: tratamento.id,
      descricao: tratamento.nome,
      quantidade,
      precoUnit,
      desconto: 0,
      taxaIva: 14, // Tratamentos geralmente com IVA
      codigoIva: 'IVA',
      motivoIsencao: null,
      total: precoUnit * quantidade,
    };
  }

  static criarFromExame(
    exame: any,
    quantidade: number,
    precoOverride?: number
  ) {
    const precoUnit = precoOverride ?? exame.preco;
    
    return {
      tipoItem: TipoItemFatura.EXAME,
      exameId: exame.id,
      descricao: exame.nome,
      quantidade,
      precoUnit,
      desconto: 0,
      taxaIva: 14, // Exames geralmente com IVA
      codigoIva: 'IVA',
      motivoIsencao: null,
      total: precoUnit * quantidade,
    };
  }

  static criarFromConsulta(
    medico: any,
    quantidade: number,
    precoOverride?: number
  ) {
    const precoUnit = precoOverride ?? medico.preco;
    
    return {
      tipoItem: TipoItemFatura.CONSULTA,
      medicoId: medico.id,
      descricao: `Consulta - ${medico.nome}`,
      quantidade,
      precoUnit,
      desconto: 0,
      taxaIva: 14, // Consultas geralmente com IVA
      codigoIva: 'IVA',
      motivoIsencao: null,
      total: precoUnit * quantidade,
    };
  }

  static criarLivre(
    descricao: string,
    quantidade: number,
    precoUnit: number,
    taxConfig: { taxaIva: number; codigoIva: string; motivoIsencao?: string }
  ) {
    return {
      tipoItem: TipoItemFatura.SERVICO,
      descricao,
      quantidade,
      precoUnit,
      desconto: 0,
      taxaIva: taxConfig.taxaIva,
      codigoIva: taxConfig.codigoIva,
      motivoIsencao: taxConfig.motivoIsencao,
      total: precoUnit * quantidade,
    };
  }
}
