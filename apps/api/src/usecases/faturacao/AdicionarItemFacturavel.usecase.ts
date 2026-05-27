import { TipoItemFatura } from '@clinicaplus/types';
import { ItemFaturaFactory } from '../../domain/faturacao/ItemFaturaFactory';
import { EstoqueDeductionService } from '../../domain/estoque/EstoqueDeductionService';
import { AppError } from '../../lib/AppError';

export class AdicionarItemFacturavelUseCase {
  constructor(
    private prisma: any,
    private estoqueCalculoService: any
  ) {}

  async execute(
    clinicaId: string,
    tipoItem: TipoItemFatura,
    itemId: string,
    quantidade: number,
    precoOverride?: number
  ) {
    switch (tipoItem) {
      case TipoItemFatura.PRODUTO: {
        const produto = await this.prisma.produto.findFirst({
          where: { id: itemId, clinicaId },
          select: {
            id: true,
            nome: true,
            precoVenda: true,
            taxaIva: true,
            codigoIva: true,
            motivoIsencao: true,
            gerenciaEstoque: true,
          },
        });

        if (!produto) throw new AppError('Produto não encontrado', 404);

        const estoqueAtual = await this.estoqueCalculoService.calcularEstoqueProduto(
          clinicaId,
          itemId
        );

        EstoqueDeductionService.validarDisponibilidade(
          produto,
          estoqueAtual,
          quantidade
        );

        return ItemFaturaFactory.criarFromProduto(
          produto,
          quantidade,
          precoOverride
        );
      }

      case TipoItemFatura.TRATAMENTO: {
        const tratamento = await this.prisma.tipoTratamento.findFirst({
          where: { id: itemId, clinicaId },
          select: { id: true, nome: true, preco: true },
        });

        if (!tratamento) throw new AppError('Tratamento não encontrado', 404);

        return ItemFaturaFactory.criarFromTratamento(
          tratamento,
          quantidade,
          precoOverride
        );
      }

      case TipoItemFatura.EXAME: {
        const exame = await this.prisma.tipoExameClinica.findFirst({
          where: { id: itemId, clinicaId },
          select: { id: true, nome: true, preco: true },
        });

        if (!exame) throw new AppError('Exame não encontrado', 404);

        return ItemFaturaFactory.criarFromExame(
          exame,
          quantidade,
          precoOverride
        );
      }

      case TipoItemFatura.CONSULTA: {
        const medico = await this.prisma.medico.findFirst({
          where: { id: itemId, clinicaId },
          select: { id: true, nome: true, preco: true },
        });

        if (!medico) throw new AppError('Médico não encontrado', 404);

        return ItemFaturaFactory.criarFromConsulta(
          medico,
          quantidade,
          precoOverride
        );
      }

      default:
        throw new AppError('Tipo de item inválido', 400);
    }
  }
}
