import { describe, it, expect, beforeEach, vi } from 'vitest';
import { estoqueCalculoService } from '../../services/estoque.calculo.service';
import { prisma } from '../../lib/prisma';

// Mock do Prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    estoqueLote: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    produto: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

describe('estoqueCalculoService', () => {
  const mockClinicaId = 'clinica-123';
  const mockProdutoId = 'produto-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calcularEstoqueProduto', () => {
    it('deve calcular estoque atual de um produto', async () => {
      (prisma.estoqueLote.aggregate as any).mockResolvedValue({
        _sum: { quantidade: 100 },
      });

      const result = await estoqueCalculoService.calcularEstoqueProduto(mockClinicaId, mockProdutoId);

      expect(result).toBe(100);
      expect(prisma.estoqueLote.aggregate).toHaveBeenCalledWith({
        where: { clinicaId: mockClinicaId, produtoId: mockProdutoId },
        _sum: { quantidade: true },
      });
    });

    it('deve retornar 0 quando não há lotes', async () => {
      (prisma.estoqueLote.aggregate as any).mockResolvedValue({
        _sum: { quantidade: null },
      });

      const result = await estoqueCalculoService.calcularEstoqueProduto(mockClinicaId, mockProdutoId);

      expect(result).toBe(0);
    });
  });

  describe('calcularEstoqueBatch', () => {
    it('deve calcular estoque de múltiplos produtos em batch', async () => {
      const produtoIds = ['produto-1', 'produto-2', 'produto-3'];
      (prisma.estoqueLote.findMany as any).mockResolvedValue([
        { produtoId: 'produto-1', quantidade: 50 },
        { produtoId: 'produto-1', quantidade: 30 },
        { produtoId: 'produto-2', quantidade: 20 },
        { produtoId: 'produto-3', quantidade: 10 },
      ]);

      const result = await estoqueCalculoService.calcularEstoqueBatch(mockClinicaId, produtoIds);

      expect(result).toEqual({
        'produto-1': 80,
        'produto-2': 20,
        'produto-3': 10,
      });
    });

    it('deve retornar objeto vazio quando não há produtoIds', async () => {
      const result = await estoqueCalculoService.calcularEstoqueBatch(mockClinicaId, []);

      expect(result).toEqual({});
    });
  });

  describe('encontrarLoteFIFO', () => {
    it('deve encontrar lote disponível usando FIFO (validade mais próxima)', async () => {
      const mockLote = { id: 'lote-1' };
      (prisma.estoqueLote.findFirst as any).mockResolvedValue(mockLote);

      const result = await estoqueCalculoService.encontrarLoteFIFO(mockClinicaId, mockProdutoId, 10);

      expect(result).toBe('lote-1');
      expect(prisma.estoqueLote.findFirst).toHaveBeenCalledWith({
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

    it('deve retornar null quando não há lote disponível', async () => {
      (prisma.estoqueLote.findFirst as any).mockResolvedValue(null);

      const result = await estoqueCalculoService.encontrarLoteFIFO(mockClinicaId, mockProdutoId, 10);

      expect(result).toBeNull();
    });
  });

  describe('verificarEstoqueMinimo', () => {
    it('deve retornar true quando estoque está abaixo do mínimo', async () => {
      (prisma.produto.findFirst as any).mockResolvedValue({
        estoqueMinimo: 10,
        gerenciaEstoque: true,
      });
      (prisma.estoqueLote.aggregate as any).mockResolvedValue({
        _sum: { quantidade: 5 },
      });

      const result = await estoqueCalculoService.verificarEstoqueMinimo(mockClinicaId, mockProdutoId);

      expect(result).toBe(true);
    });

    it('deve retornar false quando estoque está acima do mínimo', async () => {
      (prisma.produto.findFirst as any).mockResolvedValue({
        estoqueMinimo: 10,
        gerenciaEstoque: true,
      });
      (prisma.estoqueLote.aggregate as any).mockResolvedValue({
        _sum: { quantidade: 15 },
      });

      const result = await estoqueCalculoService.verificarEstoqueMinimo(mockClinicaId, mockProdutoId);

      expect(result).toBe(false);
    });

    it('deve retornar false quando produto não gerencia estoque', async () => {
      (prisma.produto.findFirst as any).mockResolvedValue({
        estoqueMinimo: 10,
        gerenciaEstoque: false,
      });

      const result = await estoqueCalculoService.verificarEstoqueMinimo(mockClinicaId, mockProdutoId);

      expect(result).toBe(false);
    });
  });

  describe('verificarSaldoLote', () => {
    it('deve retornar true quando saldo é suficiente', async () => {
      (prisma.estoqueLote.findFirst as any).mockResolvedValue({
        quantidade: 100,
      });

      const result = await estoqueCalculoService.verificarSaldoLote(mockClinicaId, 'lote-1', 50);

      expect(result).toBe(true);
    });

    it('deve retornar false quando saldo é insuficiente', async () => {
      (prisma.estoqueLote.findFirst as any).mockResolvedValue({
        quantidade: 30,
      });

      const result = await estoqueCalculoService.verificarSaldoLote(mockClinicaId, 'lote-1', 50);

      expect(result).toBe(false);
    });

    it('deve retornar false quando lote não existe', async () => {
      (prisma.estoqueLote.findFirst as any).mockResolvedValue(null);

      const result = await estoqueCalculoService.verificarSaldoLote(mockClinicaId, 'lote-1', 50);

      expect(result).toBe(false);
    });
  });

  describe('verificarSaldoProduto', () => {
    it('deve retornar true quando saldo do produto é suficiente', async () => {
      (prisma.estoqueLote.aggregate as any).mockResolvedValue({
        _sum: { quantidade: 100 },
      });

      const result = await estoqueCalculoService.verificarSaldoProduto(mockClinicaId, mockProdutoId, 50);

      expect(result).toBe(true);
    });

    it('deve retornar false quando saldo do produto é insuficiente', async () => {
      (prisma.estoqueLote.aggregate as any).mockResolvedValue({
        _sum: { quantidade: 30 },
      });

      const result = await estoqueCalculoService.verificarSaldoProduto(mockClinicaId, mockProdutoId, 50);

      expect(result).toBe(false);
    });
  });

  describe('calcularValorEstoqueProduto', () => {
    it('deve calcular valor total do estoque de um produto', async () => {
      (prisma.produto.findFirst as any).mockResolvedValue({
        precoCusto: 100,
      });
      (prisma.estoqueLote.findMany as any).mockResolvedValue([
        { quantidade: 10 },
        { quantidade: 20 },
      ]);

      const result = await estoqueCalculoService.calcularValorEstoqueProduto(mockClinicaId, mockProdutoId);

      expect(result).toBe(3000); // (10 + 20) * 100
    });

    it('deve retornar 0 quando produto não existe', async () => {
      (prisma.produto.findFirst as any).mockResolvedValue(null);

      const result = await estoqueCalculoService.calcularValorEstoqueProduto(mockClinicaId, mockProdutoId);

      expect(result).toBe(0);
    });
  });

  describe('calcularValorEstoqueBatch', () => {
    it('deve calcular valor de estoque de múltiplos produtos em batch', async () => {
      const produtoIds = ['produto-1', 'produto-2'];
      (prisma.produto.findMany as any).mockResolvedValue([
        { id: 'produto-1', precoCusto: 100 },
        { id: 'produto-2', precoCusto: 50 },
      ]);
      (prisma.estoqueLote.findMany as any).mockResolvedValue([
        { produtoId: 'produto-1', quantidade: 10 },
        { produtoId: 'produto-2', quantidade: 20 },
      ]);

      const result = await estoqueCalculoService.calcularValorEstoqueBatch(mockClinicaId, produtoIds);

      expect(result).toEqual({
        'produto-1': 1000, // 10 * 100
        'produto-2': 1000, // 20 * 50
      });
    });
  });

  describe('contarLotesValidadeProxima', () => {
    it('deve contar lotes com validade próxima', async () => {
      (prisma.estoqueLote.count as any).mockResolvedValue(5);

      const result = await estoqueCalculoService.contarLotesValidadeProxima(mockClinicaId, 30);

      expect(result).toBe(5);
      expect(prisma.estoqueLote.count).toHaveBeenCalledWith({
        where: {
          clinicaId: mockClinicaId,
          dataValidade: expect.any(Object),
          quantidade: { gt: 0 },
        },
      });
    });
  });

  describe('contarProdutosSemEstoque', () => {
    it('deve contar produtos com estoque zero', async () => {
      (prisma.produto.findMany as any).mockResolvedValue([
        { id: 'produto-1' },
        { id: 'produto-2' },
      ]);
      (prisma.estoqueLote.findMany as any).mockResolvedValue([
        { produtoId: 'produto-1', quantidade: 0 },
        { produtoId: 'produto-2', quantidade: 5 },
      ]);

      const result = await estoqueCalculoService.contarProdutosSemEstoque(mockClinicaId);

      expect(result).toBe(1);
    });

    it('deve retornar 0 quando não há produtos com gerenciaEstoque', async () => {
      (prisma.produto.findMany as any).mockResolvedValue([]);

      const result = await estoqueCalculoService.contarProdutosSemEstoque(mockClinicaId);

      expect(result).toBe(0);
    });
  });

  describe('obterResumoEstoque', () => {
    it('deve obter resumo completo de estoque de um produto', async () => {
      (prisma.estoqueLote.aggregate as any).mockResolvedValue({ _sum: { quantidade: 100 } });
      (prisma.produto.findFirst as any).mockResolvedValue({ estoqueMinimo: 10 });
      (prisma.estoqueLote.count as any).mockResolvedValue(3);

      const result = await estoqueCalculoService.obterResumoEstoque(mockClinicaId, mockProdutoId);

      expect(result).toEqual({
        estoqueAtual: 100,
        valorTotal: 0, // valorTotal será calculado com precoCusto
        abaixoMinimo: false,
        totalLotes: 3,
      });
    });
  });
});
