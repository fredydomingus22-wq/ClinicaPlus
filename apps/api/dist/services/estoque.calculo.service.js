"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estoqueCalculoService = void 0;
const prisma_1 = require("../lib/prisma");
const redis_1 = require("../lib/redis");
/**
 * Service centralizado para cálculos de estoque
 * Elimina lógica duplicada em produtos.service.ts, estoque.service.ts e analytics.estoque.service.ts
 * Mantém consistência com a arquitetura atual do projeto (Express + Prisma + TypeScript)
 * Usa cache Redis para otimizar queries frequentes
 */
const CACHE_TTL = 300; // 5 minutos em segundos
/**
 * Helper para gerar chave de cache
 */
function cacheKey(prefix, clinicaId, ...parts) {
    return `estoque:${prefix}:${clinicaId}:${parts.join(':')}`;
}
/**
 * Helper para obter do cache
 */
async function getFromCache(key) {
    try {
        const cached = await redis_1.redis.get(key);
        return cached ? JSON.parse(cached) : null;
    }
    catch (error) {
        // Silenciosamente falhar se o cache não estiver disponível
        return null;
    }
}
/**
 * Helper para salvar no cache
 */
async function setCache(key, value) {
    try {
        await redis_1.redis.setex(key, CACHE_TTL, JSON.stringify(value));
    }
    catch (error) {
        // Silenciosamente falhar se o cache não estiver disponível
    }
}
/**
 * Helper para invalidar cache de um produto
 */
async function invalidateProdutoCache(clinicaId, produtoId) {
    try {
        const pattern = `estoque:*:${clinicaId}:${produtoId}*`;
        const keys = await redis_1.redis.keys(pattern);
        if (keys.length > 0) {
            await redis_1.redis.del(...keys);
        }
    }
    catch (error) {
        // Silenciosamente falhar se o cache não estiver disponível
    }
}
exports.estoqueCalculoService = {
    /**
     * Calcula estoque atual de um produto (soma de todos os lotes)
     */
    async calcularEstoqueProduto(clinicaId, produtoId) {
        const key = cacheKey('produto', clinicaId, produtoId);
        const cached = await getFromCache(key);
        if (cached !== null)
            return cached;
        const result = await prisma_1.prisma.estoqueLote.aggregate({
            where: { clinicaId, produtoId },
            _sum: { quantidade: true },
        });
        const estoque = result._sum.quantidade || 0;
        await setCache(key, estoque);
        return estoque;
    },
    /**
     * Calcula estoque atual de múltiplos produtos em batch
     * Otimizado para evitar N+1 queries
     */
    async calcularEstoqueBatch(clinicaId, produtoIds) {
        if (produtoIds.length === 0)
            return {};
        // Tentar obter do cache para cada produto
        const estoque = {};
        const idsToFetch = [];
        for (const produtoId of produtoIds) {
            const key = cacheKey('produto', clinicaId, produtoId);
            const cached = await getFromCache(key);
            if (cached !== null) {
                estoque[produtoId] = cached;
            }
            else {
                idsToFetch.push(produtoId);
            }
        }
        // Buscar apenas os que não estão em cache
        if (idsToFetch.length > 0) {
            const lotes = await prisma_1.prisma.estoqueLote.findMany({
                where: { clinicaId, produtoId: { in: idsToFetch } },
                select: { produtoId: true, quantidade: true },
            });
            for (const lote of lotes) {
                estoque[lote.produtoId] = (estoque[lote.produtoId] || 0) + lote.quantidade;
            }
            // Salvar no cache
            for (const produtoId of idsToFetch) {
                const key = cacheKey('produto', clinicaId, produtoId);
                await setCache(key, estoque[produtoId] || 0);
            }
        }
        return estoque;
    },
    /**
     * Encontra lote disponível para saída usando FIFO (First In, First Out)
     * Prioriza lotes com data de validade mais próxima
     */
    async encontrarLoteFIFO(clinicaId, produtoId, quantidade) {
        const lote = await prisma_1.prisma.estoqueLote.findFirst({
            where: {
                clinicaId,
                produtoId,
                quantidade: { gte: quantidade },
            },
            orderBy: [
                { dataValidade: 'asc' }, // Prioriza validade mais próxima
                { criadoEm: 'asc' }, // Depois, o mais antigo
            ],
            select: { id: true },
        });
        return lote?.id || null;
    },
    /**
     * Verifica se produto está abaixo do estoque mínimo
     */
    async verificarEstoqueMinimo(clinicaId, produtoId) {
        const [produto, estoque] = await Promise.all([
            prisma_1.prisma.produto.findFirst({
                where: { id: produtoId, clinicaId },
                select: { estoqueMinimo: true, gerenciaEstoque: true },
            }),
            this.calcularEstoqueProduto(clinicaId, produtoId),
        ]);
        if (!produto || !produto.gerenciaEstoque)
            return false;
        return estoque < produto.estoqueMinimo;
    },
    /**
     * Verifica se há saldo suficiente em um lote específico
     */
    async verificarSaldoLote(clinicaId, loteId, quantidade) {
        const lote = await prisma_1.prisma.estoqueLote.findFirst({
            where: { id: loteId, clinicaId },
            select: { quantidade: true },
        });
        if (!lote)
            return false;
        return lote.quantidade >= quantidade;
    },
    /**
     * Verifica se há saldo suficiente em qualquer lote do produto
     */
    async verificarSaldoProduto(clinicaId, produtoId, quantidade) {
        const estoque = await this.calcularEstoqueProduto(clinicaId, produtoId);
        return estoque >= quantidade;
    },
    /**
     * Calcula valor total do estoque de um produto (soma: quantidade_lote * precoCusto)
     */
    async calcularValorEstoqueProduto(clinicaId, produtoId) {
        const [produto, lotes] = await Promise.all([
            prisma_1.prisma.produto.findFirst({
                where: { id: produtoId, clinicaId },
                select: { precoCusto: true },
            }),
            prisma_1.prisma.estoqueLote.findMany({
                where: { clinicaId, produtoId },
                select: { quantidade: true },
            }),
        ]);
        if (!produto)
            return 0;
        return lotes.reduce((acc, lote) => acc + lote.quantidade * produto.precoCusto, 0);
    },
    /**
     * Calcula valor total do estoque de múltiplos produtos em batch
     */
    async calcularValorEstoqueBatch(clinicaId, produtoIds) {
        if (produtoIds.length === 0)
            return {};
        const [produtos, lotes] = await Promise.all([
            prisma_1.prisma.produto.findMany({
                where: { id: { in: produtoIds }, clinicaId },
                select: { id: true, precoCusto: true },
            }),
            prisma_1.prisma.estoqueLote.findMany({
                where: { clinicaId, produtoId: { in: produtoIds } },
                select: { produtoId: true, quantidade: true },
            }),
        ]);
        const precoPorProduto = {};
        for (const produto of produtos) {
            precoPorProduto[produto.id] = produto.precoCusto;
        }
        const valorPorProduto = {};
        for (const lote of lotes) {
            const preco = precoPorProduto[lote.produtoId] || 0;
            valorPorProduto[lote.produtoId] = (valorPorProduto[lote.produtoId] || 0) + lote.quantidade * preco;
        }
        return valorPorProduto;
    },
    /**
     * Conta lotes com validade próxima (30 dias)
     */
    async contarLotesValidadeProxima(clinicaId, dias = 30) {
        const agora = new Date();
        const dataLimite = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);
        const count = await prisma_1.prisma.estoqueLote.count({
            where: {
                clinicaId,
                dataValidade: {
                    gte: agora,
                    lte: dataLimite,
                },
                quantidade: { gt: 0 },
            },
        });
        return count;
    },
    /**
     * Conta produtos com estoque zero (dentre os que gerenciam estoque)
     */
    async contarProdutosSemEstoque(clinicaId) {
        const produtosComEstoque = await prisma_1.prisma.produto.findMany({
            where: { clinicaId, gerenciaEstoque: true, ativo: true },
            select: { id: true },
        });
        if (produtosComEstoque.length === 0)
            return 0;
        const produtoIds = produtosComEstoque.map(p => p.id);
        const estoqueBatch = await this.calcularEstoqueBatch(clinicaId, produtoIds);
        return Object.values(estoqueBatch).filter(estoque => estoque === 0).length;
    },
    /**
     * Obtém resumo de estoque por produto
     */
    async obterResumoEstoque(clinicaId, produtoId) {
        const [estoque, valor, abaixoMinimo, totalLotes] = await Promise.all([
            this.calcularEstoqueProduto(clinicaId, produtoId),
            this.calcularValorEstoqueProduto(clinicaId, produtoId),
            this.verificarEstoqueMinimo(clinicaId, produtoId),
            prisma_1.prisma.estoqueLote.count({
                where: { clinicaId, produtoId },
            }),
        ]);
        return {
            estoqueAtual: estoque,
            valorTotal: valor,
            abaixoMinimo,
            totalLotes,
        };
    },
};
