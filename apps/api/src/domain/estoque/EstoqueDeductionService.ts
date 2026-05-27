export class EstoqueDeductionService {
  static validarDisponibilidade(
    produto: { gerenciaEstoque: boolean },
    estoqueAtual: number,
    quantidade: number
  ): void {
    if (produto.gerenciaEstoque && estoqueAtual < quantidade) {
      throw new Error(
        `Estoque insuficiente. Disponível: ${estoqueAtual}, Solicitado: ${quantidade}`
      );
    }
  }
}
