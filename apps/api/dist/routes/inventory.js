"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const produtos_service_1 = require("../services/produtos.service");
const estoque_service_1 = require("../services/estoque.service");
const analytics_estoque_service_1 = require("../services/analytics.estoque.service");
const prisma_1 = require("../lib/prisma");
const inventory_dto_1 = require("../dto/inventory.dto");
const inventory_schema_1 = require("../schemas/inventory.schema");
const router = (0, express_1.Router)();
// ─── ANALYTICS ────────────────────────────────────────────────────────────────
/** GET /inventory/analytics/kpis?dataInicio=&dataFim=&categoriaId= */
router.get('/analytics/kpis', async (req, res) => {
    const filters = inventory_schema_1.AnalyticsFiltersSchema.parse(req.query);
    const analyticsFilters = {
        clinicaId: req.clinica.id,
        ...filters,
    };
    const result = await analytics_estoque_service_1.analyticsEstoqueService.getKpis(analyticsFilters);
    res.json({ data: result });
});
/** GET /inventory/analytics/top-movimentados?dataInicio=&dataFim=&limite= */
router.get('/analytics/top-movimentados', async (req, res) => {
    const filters = inventory_schema_1.AnalyticsFiltersSchema.parse(req.query);
    const { limite } = req.query;
    const analyticsFilters = {
        clinicaId: req.clinica.id,
        ...filters,
    };
    const result = await analytics_estoque_service_1.analyticsEstoqueService.getTopMovimentados(analyticsFilters, limite ? parseInt(limite, 10) : 20);
    res.json({ data: result });
});
/** GET /inventory/analytics/tendencia-diaria?dataInicio=&dataFim= */
router.get('/analytics/tendencia-diaria', async (req, res) => {
    const filters = inventory_schema_1.AnalyticsFiltersSchema.parse(req.query);
    const analyticsFilters = {
        clinicaId: req.clinica.id,
        ...filters,
    };
    const result = await analytics_estoque_service_1.analyticsEstoqueService.getTendenciaDiaria(analyticsFilters);
    res.json({ data: result });
});
/** GET /inventory/analytics/previsao-ruptura?diasHistorico= */
router.get('/analytics/previsao-ruptura', async (req, res) => {
    const { diasHistorico } = req.query;
    const result = await analytics_estoque_service_1.analyticsEstoqueService.getPrevisaoRuptura(req.clinica.id, diasHistorico ? parseInt(diasHistorico, 10) : 30);
    res.json({ data: result });
});
/** GET /inventory/analytics/categorias?dataInicio=&dataFim= */
router.get('/analytics/categorias', async (req, res) => {
    const filters = inventory_schema_1.AnalyticsFiltersSchema.parse(req.query);
    const analyticsFilters = {
        clinicaId: req.clinica.id,
        ...filters,
    };
    const result = await analytics_estoque_service_1.analyticsEstoqueService.getDistribuicaoCategorias(analyticsFilters);
    res.json({ data: result });
});
// --- CATEGORIAS ---
router.get('/categorias', async (req, res) => {
    const result = await produtos_service_1.produtosService.listCategorias(req.clinica.id);
    res.json(result);
});
router.post('/categorias', async (req, res) => {
    const result = await produtos_service_1.produtosService.createCategoria(req.clinica.id, req.body);
    res.json(result);
});
// --- PRODUTOS ---
router.get('/produtos', async (req, res) => {
    const filters = inventory_schema_1.ListProdutosSchema.parse(req.query);
    const result = await produtos_service_1.produtosService.listProdutos(req.clinica.id, filters);
    res.json(result);
});
router.get('/produtos/:id', async (req, res) => {
    const result = await produtos_service_1.produtosService.getProduto(req.clinica.id, req.params['id']);
    res.json(result);
});
router.post('/produtos', async (req, res) => {
    const result = await produtos_service_1.produtosService.createProduto(req.clinica.id, req.body);
    res.json(result);
});
router.put('/produtos/:id', async (req, res) => {
    const result = await produtos_service_1.produtosService.updateProduto(req.clinica.id, req.params['id'], req.body);
    res.json(result);
});
// --- ESTOQUE & LOTES ---
router.get('/produtos/:id/lotes', async (req, res) => {
    const result = await estoque_service_1.estoqueService.listLotes(req.clinica.id, req.params['id']);
    res.json(result);
});
router.get('/produtos/:id/movimentacoes', async (req, res) => {
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [movimentacoes, total] = await Promise.all([
        prisma_1.prisma.movimentacaoEstoque.findMany({
            where: {
                clinicaId: req.clinica.id,
                produtoId: req.params['id']
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
            orderBy: { criadoEm: 'desc' },
            skip,
            take: parseInt(limit),
        }),
        prisma_1.prisma.movimentacaoEstoque.count({
            where: {
                clinicaId: req.clinica.id,
                produtoId: req.params['id']
            },
        }),
    ]);
    res.json({
        data: movimentacoes.map(m => inventory_dto_1.InventoryMapper.toMovimentacaoResponse(m)),
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        }
    });
});
router.post('/lotes', async (req, res) => {
    const result = await estoque_service_1.estoqueService.createLote(req.clinica.id, {
        ...req.body,
        utilizadorId: req.user.id,
    });
    res.json({ data: result });
});
router.post('/movimentar', async (req, res) => {
    const result = await estoque_service_1.estoqueService.movimentar(req.clinica.id, {
        ...req.body,
        utilizadorId: req.user.id,
    });
    res.json({ data: result });
});
exports.default = router;
