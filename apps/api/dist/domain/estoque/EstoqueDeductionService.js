"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstoqueDeductionService = void 0;
class EstoqueDeductionService {
    static validarDisponibilidade(produto, estoqueAtual, quantidade) {
        if (produto.gerenciaEstoque && estoqueAtual < quantidade) {
            throw new Error(`Estoque insuficiente. Disponível: ${estoqueAtual}, Solicitado: ${quantidade}`);
        }
    }
}
exports.EstoqueDeductionService = EstoqueDeductionService;
