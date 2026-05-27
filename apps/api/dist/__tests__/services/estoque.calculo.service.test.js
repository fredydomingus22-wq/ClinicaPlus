"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const estoque_calculo_service_1 = require("../../services/estoque.calculo.service");
const prisma_1 = require("../../lib/prisma");
// Mock do Prisma
vitest_1.vi.mock('../../lib/prisma', () => ({
    prisma: {
        estoqueLote: {
            aggregate: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
            findFirst: vitest_1.vi.fn(),
            count: vitest_1.vi.fn(),
        },
        produto: {
            findFirst: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
            groupBy: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.describe)('estoqueCalculoService', () => {
    const mockClinicaId = 'clinica-123';
    const mockProdutoId = 'produto-123';
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('calcularEstoqueProduto', () => {
        (0, vitest_1.it)('deve calcular estoque atual de um produto', async () => {
            prisma_1.prisma.estoqueLote.aggregate.mockResolvedValue({
                _sum: { quantidade: 100 },
            });
            const result = await estoque_calculo_service_1.estoqueCalculoService.calcularEstoqueProduto(mockClinicaId, mockProdutoId);
            (0, vitest_1.expect)(result).toBe(100);
            (0, vitest_1.expect)(prisma_1.prisma.estoqueLote.aggregate).toHaveBeenCalledWith({
                where: { clinicaId: mockClinicaId, produtoId: mockProdutoId },
                _sum: { quantidade: true },
            });
        });
        (0, vitest_1.it)('deve retornar 0 quando não há lotes', async () => {
            prisma_1.prisma.estoqueLote.aggregate.mockResolvedValue({
                _sum: { quantidade: null },
            });
            const result = await estoque_calculo_service_1.estoqueCalculoService.calcularEstoqueProduto(mockClinicaId, mockProdutoId);
            (0, vitest_1.expect)(result).toBe(0);
        });
    });
    (0, vitest_1.describe)('calcularEstoqueBatch', () => {
        (0, vitest_1.it)('deve calcular estoque de múltiplos produtos em batch', async () => {
            const produtoIds = ['produto-1', 'produto-2', 'produto-3'];
            prisma_1.prisma.estoqueLote.findMany.mockResolvedValue([
                { produtoId: 'produto-1', quantidade: 50 },
                { produtoId: 'produto-1', quantidade: 30 },
                { produtoId: 'produto-2', quantidade: 20 },
                { produtoId: 'produto-3', quantidade: 10 },
            ]);
            const result = await estoque_calculo_service_1.estoqueCalculoService.calcularEstoqueBatch(mockClinicaId, produtoIds);
            (0, vitest_1.expect)(result).toEqual({
                'produto-1': 80,
                'produto-2': 20,
                'produto-3': 10,
            });
        });
        (0, vitest_1.it)('deve retornar objeto vazio quando não há produtoIds', async () => {
            const result = await estoque_calculo_service_1.estoqueCalculoService.calcularEstoqueBatch(mockClinicaId, []);
            (0, vitest_1.expect)(result).toEqual({});
        });
    });
    (0, vitest_1.describe)('encontrarLoteFIFO', () => {
        (0, vitest_1.it)('deve encontrar lote disponível usando FIFO (validade mais próxima)', async () => {
            const mockLote = { id: 'lote-1' };
            prisma_1.prisma.estoqueLote.findFirst.mockResolvedValue(mockLote);
            const result = await estoque_calculo_service_1.estoqueCalculoService.encontrarLoteFIFO(mockClinicaId, mockProdutoId, 10);
            (0, vitest_1.expect)(result).toBe('lote-1');
            (0, vitest_1.expect)(prisma_1.prisma.estoqueLote.findFirst).toHaveBeenCalledWith({
                where: {
                    clinicaId: mockClinicaId,
                    produtoId: mockProdutoId,
                    quantidade: { gte: 10 },
                },
                orderBy: [
                    { dataValidade: 'asc' },
                    { criadoEm: 'asc' },
                ],
                select: { id: true },
            });
        });
        (0, vitest_1.it)('deve retornar null quando não há lote disponível', async () => {
            prisma_1.prisma.estoqueLote.findFirst.mockResolvedValue(null);
            const result = await estoque_calculo_service_1.estoqueCalculoService.encontrarLoteFIFO(mockClinicaId, mockProdutoId, 10);
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)('verificarEstoqueMinimo', () => {
        (0, vitest_1.it)('deve retornar true quando estoque está abaixo do mínimo', async () => {
            prisma_1.prisma.produto.findFirst.mockResolvedValue({
                estoqueMinimo: 10,
                gerenciaEstoque: true,
            });
            prisma_1.prisma.estoqueLote.aggregate.mockResolvedValue({
                _sum: { quantidade: 5 },
            });
            const result = await estoque_calculo_service_1.estoqueCalculoService.verificarEstoqueMinimo(mockClinicaId, mockProdutoId);
            (0, vitest_1.expect)(result).toBe(true);
        });
        (0, vitest_1.it)('deve retornar false quando estoque está acima do mínimo', async () => {
            prisma_1.prisma.produto.findFirst.mockResolvedValue({
                estoqueMinimo: 10,
                gerenciaEstoque: true,
            });
            prisma_1.prisma.estoqueLote.aggregate.mockResolvedValue({
                _sum: { quantidade: 15 },
            });
            const result = await estoque_calculo_service_1.estoqueCalculoService.verificarEstoqueMinimo(mockClinicaId, mockProdutoId);
            (0, vitest_1.expect)(result).toBe(false);
        });
        (0, vitest_1.it)('deve retornar false quando produto não gerencia estoque', async () => {
            prisma_1.prisma.produto.findFirst.mockResolvedValue({
                estoqueMinimo: 10,
                gerenciaEstoque: false,
            });
            const result = await estoque_calculo_service_1.estoqueCalculoService.verificarEstoqueMinimo(mockClinicaId, mockProdutoId);
            (0, vitest_1.expect)(result).toBe(false);
        });
    });
    (0, vitest_1.describe)('verificarSaldoLote', () => {
        (0, vitest_1.it)('deve retornar true quando saldo é suficiente', async () => {
            prisma_1.prisma.estoqueLote.findFirst.mockResolvedValue({
                quantidade: 100,
            });
            const result = await estoque_calculo_service_1.estoqueCalculoService.verificarSaldoLote(mockClinicaId, 'lote-1', 50);
            (0, vitest_1.expect)(result).toBe(true);
        });
        (0, vitest_1.it)('deve retornar false quando saldo é insuficiente', async () => {
            prisma_1.prisma.estoqueLote.findFirst.mockResolvedValue({
                quantidade: 30,
            });
            const result = await estoque_calculo_service_1.estoqueCalculoService.verificarSaldoLote(mockClinicaId, 'lote-1', 50);
            (0, vitest_1.expect)(result).toBe(false);
        });
        (0, vitest_1.it)('deve retornar false quando lote não existe', async () => {
            prisma_1.prisma.estoqueLote.findFirst.mockResolvedValue(null);
            const result = await estoque_calculo_service_1.estoqueCalculoService.verificarSaldoLote(mockClinicaId, 'lote-1', 50);
            (0, vitest_1.expect)(result).toBe(false);
        });
    });
    (0, vitest_1.describe)('verificarSaldoProduto', () => {
        (0, vitest_1.it)('deve retornar true quando saldo do produto é suficiente', async () => {
            prisma_1.prisma.estoqueLote.aggregate.mockResolvedValue({
                _sum: { quantidade: 100 },
            });
            const result = await estoque_calculo_service_1.estoqueCalculoService.verificarSaldoProduto(mockClinicaId, mockProdutoId, 50);
            (0, vitest_1.expect)(result).toBe(true);
        });
        (0, vitest_1.it)('deve retornar false quando saldo do produto é insuficiente', async () => {
            prisma_1.prisma.estoqueLote.aggregate.mockResolvedValue({
                _sum: { quantidade: 30 },
            });
            const result = await estoque_calculo_service_1.estoqueCalculoService.verificarSaldoProduto(mockClinicaId, mockProdutoId, 50);
            (0, vitest_1.expect)(result).toBe(false);
        });
    });
    (0, vitest_1.describe)('calcularValorEstoqueProduto', () => {
        (0, vitest_1.it)('deve calcular valor total do estoque de um produto', async () => {
            prisma_1.prisma.produto.findFirst.mockResolvedValue({
                precoCusto: 100,
            });
            prisma_1.prisma.estoqueLote.findMany.mockResolvedValue([
                { quantidade: 10 },
                { quantidade: 20 },
            ]);
            const result = await estoque_calculo_service_1.estoqueCalculoService.calcularValorEstoqueProduto(mockClinicaId, mockProdutoId);
            (0, vitest_1.expect)(result).toBe(3000); // (10 + 20) * 100
        });
        (0, vitest_1.it)('deve retornar 0 quando produto não existe', async () => {
            prisma_1.prisma.produto.findFirst.mockResolvedValue(null);
            const result = await estoque_calculo_service_1.estoqueCalculoService.calcularValorEstoqueProduto(mockClinicaId, mockProdutoId);
            (0, vitest_1.expect)(result).toBe(0);
        });
    });
    (0, vitest_1.describe)('calcularValorEstoqueBatch', () => {
        (0, vitest_1.it)('deve calcular valor de estoque de múltiplos produtos em batch', async () => {
            const produtoIds = ['produto-1', 'produto-2'];
            prisma_1.prisma.produto.findMany.mockResolvedValue([
                { id: 'produto-1', precoCusto: 100 },
                { id: 'produto-2', precoCusto: 50 },
            ]);
            prisma_1.prisma.estoqueLote.findMany.mockResolvedValue([
                { produtoId: 'produto-1', quantidade: 10 },
                { produtoId: 'produto-2', quantidade: 20 },
            ]);
            const result = await estoque_calculo_service_1.estoqueCalculoService.calcularValorEstoqueBatch(mockClinicaId, produtoIds);
            (0, vitest_1.expect)(result).toEqual({
                'produto-1': 1000, // 10 * 100
                'produto-2': 1000, // 20 * 50
            });
        });
    });
    (0, vitest_1.describe)('contarLotesValidadeProxima', () => {
        (0, vitest_1.it)('deve contar lotes com validade próxima', async () => {
            prisma_1.prisma.estoqueLote.count.mockResolvedValue(5);
            const result = await estoque_calculo_service_1.estoqueCalculoService.contarLotesValidadeProxima(mockClinicaId, 30);
            (0, vitest_1.expect)(result).toBe(5);
            (0, vitest_1.expect)(prisma_1.prisma.estoqueLote.count).toHaveBeenCalledWith({
                where: {
                    clinicaId: mockClinicaId,
                    dataValidade: vitest_1.expect.any(Object),
                    quantidade: { gt: 0 },
                },
            });
        });
    });
    (0, vitest_1.describe)('contarProdutosSemEstoque', () => {
        (0, vitest_1.it)('deve contar produtos com estoque zero', async () => {
            prisma_1.prisma.produto.findMany.mockResolvedValue([
                { id: 'produto-1' },
                { id: 'produto-2' },
            ]);
            prisma_1.prisma.estoqueLote.findMany.mockResolvedValue([
                { produtoId: 'produto-1', quantidade: 0 },
                { produtoId: 'produto-2', quantidade: 5 },
            ]);
            const result = await estoque_calculo_service_1.estoqueCalculoService.contarProdutosSemEstoque(mockClinicaId);
            (0, vitest_1.expect)(result).toBe(1);
        });
        (0, vitest_1.it)('deve retornar 0 quando não há produtos com gerenciaEstoque', async () => {
            prisma_1.prisma.produto.findMany.mockResolvedValue([]);
            const result = await estoque_calculo_service_1.estoqueCalculoService.contarProdutosSemEstoque(mockClinicaId);
            (0, vitest_1.expect)(result).toBe(0);
        });
    });
    (0, vitest_1.describe)('obterResumoEstoque', () => {
        (0, vitest_1.it)('deve obter resumo completo de estoque de um produto', async () => {
            prisma_1.prisma.estoqueLote.aggregate.mockResolvedValue({ _sum: { quantidade: 100 } });
            prisma_1.prisma.produto.findFirst.mockResolvedValue({ estoqueMinimo: 10 });
            prisma_1.prisma.estoqueLote.count.mockResolvedValue(3);
            const result = await estoque_calculo_service_1.estoqueCalculoService.obterResumoEstoque(mockClinicaId, mockProdutoId);
            (0, vitest_1.expect)(result).toEqual({
                estoqueAtual: 100,
                valorTotal: 0, // valorTotal será calculado com precoCusto
                abaixoMinimo: false,
                totalLotes: 3,
            });
        });
    });
});
