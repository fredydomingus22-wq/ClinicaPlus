"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdicionarItemFacturavelUseCase = void 0;
const types_1 = require("@clinicaplus/types");
const ItemFaturaFactory_1 = require("../../domain/faturacao/ItemFaturaFactory");
const EstoqueDeductionService_1 = require("../../domain/estoque/EstoqueDeductionService");
const errors_1 = require("../../lib/errors");
class AdicionarItemFacturavelUseCase {
    constructor(prisma, estoqueCalculoService) {
        this.prisma = prisma;
        this.estoqueCalculoService = estoqueCalculoService;
    }
    async execute(clinicaId, tipoItem, itemId, quantidade, precoOverride) {
        switch (tipoItem) {
            case types_1.TipoItemFatura.PRODUTO: {
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
                if (!produto)
                    throw new errors_1.AppError('Produto não encontrado', 404);
                const estoqueAtual = await this.estoqueCalculoService.calcularEstoqueProduto(clinicaId, itemId);
                EstoqueDeductionService_1.EstoqueDeductionService.validarDisponibilidade(produto, estoqueAtual, quantidade);
                return ItemFaturaFactory_1.ItemFaturaFactory.criarFromProduto(produto, quantidade, precoOverride);
            }
            case types_1.TipoItemFatura.TRATAMENTO: {
                const tratamento = await this.prisma.tipoTratamento.findFirst({
                    where: { id: itemId, clinicaId },
                    select: { id: true, nome: true, preco: true },
                });
                if (!tratamento)
                    throw new errors_1.AppError('Tratamento não encontrado', 404);
                return ItemFaturaFactory_1.ItemFaturaFactory.criarFromTratamento(tratamento, quantidade, precoOverride);
            }
            case types_1.TipoItemFatura.EXAME: {
                const exame = await this.prisma.tipoExameClinica.findFirst({
                    where: { id: itemId, clinicaId },
                    select: { id: true, nome: true, preco: true },
                });
                if (!exame)
                    throw new errors_1.AppError('Exame não encontrado', 404);
                return ItemFaturaFactory_1.ItemFaturaFactory.criarFromExame(exame, quantidade, precoOverride);
            }
            case types_1.TipoItemFatura.CONSULTA: {
                const medico = await this.prisma.medico.findFirst({
                    where: { id: itemId, clinicaId },
                    select: { id: true, nome: true, preco: true },
                });
                if (!medico)
                    throw new errors_1.AppError('Médico não encontrado', 404);
                return ItemFaturaFactory_1.ItemFaturaFactory.criarFromConsulta(medico, quantidade, precoOverride);
            }
            default:
                throw new errors_1.AppError('Tipo de item inválido', 400);
        }
    }
}
exports.AdicionarItemFacturavelUseCase = AdicionarItemFacturavelUseCase;
