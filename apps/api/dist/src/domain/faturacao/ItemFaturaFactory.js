"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemFaturaFactory = void 0;
const types_1 = require("@clinicaplus/types");
class ItemFaturaFactory {
    static criarFromProduto(produto, quantidade, precoOverride) {
        const precoUnit = precoOverride ?? produto.precoVenda;
        return {
            tipoItem: types_1.TipoItemFatura.PRODUTO,
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
    static criarFromTratamento(tratamento, quantidade, precoOverride) {
        const precoUnit = precoOverride ?? tratamento.preco;
        return {
            tipoItem: types_1.TipoItemFatura.TRATAMENTO,
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
    static criarFromExame(exame, quantidade, precoOverride) {
        const precoUnit = precoOverride ?? exame.preco;
        return {
            tipoItem: types_1.TipoItemFatura.EXAME,
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
    static criarFromConsulta(medico, quantidade, precoOverride) {
        const precoUnit = precoOverride ?? medico.preco;
        return {
            tipoItem: types_1.TipoItemFatura.CONSULTA,
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
    static criarLivre(descricao, quantidade, precoUnit, taxConfig) {
        return {
            tipoItem: types_1.TipoItemFatura.SERVICO,
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
exports.ItemFaturaFactory = ItemFaturaFactory;
