"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.estoqueService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const estoque_calculo_service_1 = require("./estoque.calculo.service");
const inventory_dto_1 = require("../dto/inventory.dto");
const inventory_schema_1 = require("../schemas/inventory.schema");
/**
 * Helper para invalidar cache de estoque após movimentações
 */
async function invalidateEstoqueCache(clinicaId, produtoId) {
    try {
        const pattern = `estoque:*:${clinicaId}:${produtoId}*`;
        const { redis } = await Promise.resolve().then(() => __importStar(require('../lib/redis')));
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }
    catch {
        // Silenciosamente falhar se o cache não estiver disponível
    }
}
exports.estoqueService = {
    /**
     * Registra uma movimentação de estoque
     */
    async movimentar(clinicaId, data) {
        const validated = inventory_schema_1.MovimentarEstoqueSchema.parse(data);
        const { produtoId, quantidade, tipo, loteId } = validated;
        // 1. Validar produto
        const produto = await prisma_1.prisma.produto.findFirst({
            where: { id: produtoId, clinicaId },
            select: { id: true, gerenciaEstoque: true },
        });
        if (!produto) {
            throw new AppError_1.AppError('Produto não encontrado', 404);
        }
        if (!produto.gerenciaEstoque) {
            throw new AppError_1.AppError('Este produto não possui controle de estoque ativo', 400);
        }
        // 2. Se for saída, validar saldo
        const eSaida = ['SAIDA', 'VENDA'].includes(tipo);
        const fator = eSaida ? -1 : 1;
        return await prisma_1.prisma.$transaction(async (tx) => {
            let loteFinalId = loteId || undefined;
            // Se for saída e não especificou lote, tentar FIFO usando service centralizado
            if (eSaida && !loteFinalId) {
                loteFinalId = await estoque_calculo_service_1.estoqueCalculoService.encontrarLoteFIFO(clinicaId, produtoId, quantidade) || undefined;
                if (!loteFinalId) {
                    throw new AppError_1.AppError('Não há estoque suficiente disponível em lotes válidos', 400);
                }
            }
            // Se tiver lote (especificado ou encontrado), atualizar saldo do lote
            if (loteFinalId) {
                const saldoSuficiente = await estoque_calculo_service_1.estoqueCalculoService.verificarSaldoLote(clinicaId, loteFinalId, quantidade);
                if (!saldoSuficiente) {
                    const lote = await tx.estoqueLote.findFirst({
                        where: { id: loteFinalId, clinicaId },
                        select: { numeroLote: true, quantidade: true },
                    });
                    if (lote) {
                        throw new AppError_1.AppError(`Estoque insuficiente no lote ${lote.numeroLote}. Disponível: ${lote.quantidade}`, 400);
                    }
                    throw new AppError_1.AppError('Lote não encontrado', 404);
                }
                await tx.estoqueLote.update({
                    where: { id: loteFinalId },
                    data: { quantidade: { increment: quantidade * fator } },
                });
            }
            // 3. Registrar movimentação
            const movimento = await tx.movimentacaoEstoque.create({
                data: {
                    clinicaId,
                    produtoId,
                    loteId: loteFinalId || null,
                    quantidade,
                    tipo,
                    motivo: validated.motivo || null,
                    documentoRef: validated.documentoRef || null,
                    utilizadorId: validated.utilizadorId || null,
                },
                select: {
                    id: true,
                    clinicaId: true,
                    produtoId: true,
                    loteId: true,
                    utilizadorId: true,
                    tipo: true,
                    quantidade: true,
                    motivo: true,
                    documentoRef: true,
                    criadoEm: true,
                    lote: {
                        select: {
                            id: true,
                            clinicaId: true,
                            produtoId: true,
                            numeroLote: true,
                            dataValidade: true,
                            quantidade: true,
                            criadoEm: true,
                            atualizadoEm: true,
                        },
                    },
                    produto: {
                        select: {
                            id: true,
                            nome: true,
                            codigo: true,
                        },
                    },
                },
            });
            // Invalidar cache do produto após movimentação
            await invalidateEstoqueCache(clinicaId, produtoId);
            return inventory_dto_1.InventoryMapper.toMovimentacaoResponse(movimento);
        });
    },
    /**
     * Lista lotes de um produto
     */
    async listLotes(clinicaId, produtoId) {
        const lotes = await prisma_1.prisma.estoqueLote.findMany({
            where: { clinicaId, produtoId },
            select: {
                id: true,
                clinicaId: true,
                produtoId: true,
                numeroLote: true,
                dataValidade: true,
                quantidade: true,
                criadoEm: true,
                atualizadoEm: true,
                produto: {
                    select: {
                        id: true,
                        nome: true,
                        codigo: true,
                    },
                },
            },
            orderBy: [
                { dataValidade: 'asc' },
                { criadoEm: 'desc' },
            ],
        });
        return { data: lotes.map(l => inventory_dto_1.InventoryMapper.toLoteComProdutoResponse(l)) };
    },
    /**
     * Obtém o estoque total de um produto (soma de todos os lotes)
     * DEPRECATED: Use estoqueCalculoService.calcularEstoqueProduto
     */
    async getEstoqueTotal(clinicaId, produtoId) {
        return estoque_calculo_service_1.estoqueCalculoService.calcularEstoqueProduto(clinicaId, produtoId);
    },
    /**
     * Cria ou atualiza um lote manualmente (entrada de mercadoria manual)
     */
    async createLote(clinicaId, data) {
        const validated = inventory_schema_1.CreateLoteSchema.parse(data);
        // Validar produto
        const produto = await prisma_1.prisma.produto.findFirst({
            where: { id: validated.produtoId, clinicaId },
            select: { id: true },
        });
        if (!produto)
            throw new AppError_1.AppError('Produto não encontrado', 404);
        return await prisma_1.prisma.$transaction(async (tx) => {
            // Tentar encontrar lote existente com mesmo número
            let lote = await tx.estoqueLote.findFirst({
                where: { clinicaId, produtoId: validated.produtoId, numeroLote: validated.numeroLote },
                select: { id: true },
            });
            if (lote) {
                lote = await tx.estoqueLote.update({
                    where: { id: lote.id },
                    data: {
                        quantidade: { increment: validated.quantidade },
                        ...(validated.dataValidade ? { dataValidade: validated.dataValidade } : {}),
                    },
                    select: {
                        id: true,
                        clinicaId: true,
                        produtoId: true,
                        numeroLote: true,
                        dataValidade: true,
                        quantidade: true,
                        criadoEm: true,
                        atualizadoEm: true,
                    },
                });
            }
            else {
                lote = await tx.estoqueLote.create({
                    data: {
                        clinicaId,
                        produtoId: validated.produtoId,
                        numeroLote: validated.numeroLote,
                        dataValidade: validated.dataValidade || null,
                        quantidade: validated.quantidade,
                    },
                    select: {
                        id: true,
                        clinicaId: true,
                        produtoId: true,
                        numeroLote: true,
                        dataValidade: true,
                        quantidade: true,
                        criadoEm: true,
                        atualizadoEm: true,
                    },
                });
            }
            // Registrar movimento de entrada
            await tx.movimentacaoEstoque.create({
                data: {
                    clinicaId,
                    produtoId: validated.produtoId,
                    loteId: lote.id,
                    quantidade: validated.quantidade,
                    tipo: 'ENTRADA',
                    motivo: 'Entrada manual / Cadastro de lote',
                    utilizadorId: validated.utilizadorId || null,
                },
            });
            // Invalidar cache do produto após criação de lote
            await invalidateEstoqueCache(clinicaId, validated.produtoId);
            return inventory_dto_1.InventoryMapper.toLoteResponse(lote);
        });
    }
};
