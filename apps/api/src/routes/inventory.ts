import { Router } from 'express';
import { produtosService } from '../services/produtos.service';
import { estoqueService } from '../services/estoque.service';
import { analyticsEstoqueService, AnalyticsFilters } from '../services/analytics.estoque.service';
import { prisma } from '../lib/prisma';
import { InventoryMapper } from '../dto/inventory.dto';
import {
  AnalyticsFiltersSchema,
  ListProdutosSchema,
} from '../schemas/inventory.schema';

const router = Router();

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

/** GET /inventory/analytics/kpis?dataInicio=&dataFim=&categoriaId= */
router.get('/analytics/kpis', async (req, res) => {
  const filters = AnalyticsFiltersSchema.parse(req.query);
  const analyticsFilters: AnalyticsFilters = {
    clinicaId: req.clinica.id,
    ...(filters.dataInicio && { dataInicio: filters.dataInicio.toISOString() }),
    ...(filters.dataFim && { dataFim: filters.dataFim.toISOString() }),
    ...(filters.categoriaId && { categoriaId: filters.categoriaId }),
  };

  const result = await analyticsEstoqueService.getKpis(analyticsFilters);
  res.json({ data: result });
});

/** GET /inventory/analytics/top-movimentados?dataInicio=&dataFim=&limite= */
router.get('/analytics/top-movimentados', async (req, res) => {
  const filters = AnalyticsFiltersSchema.parse(req.query);
  const { limite } = req.query;
  const analyticsFilters: AnalyticsFilters = {
    clinicaId: req.clinica.id,
    ...(filters.dataInicio && { dataInicio: filters.dataInicio.toISOString() }),
    ...(filters.dataFim && { dataFim: filters.dataFim.toISOString() }),
    ...(filters.categoriaId && { categoriaId: filters.categoriaId }),
  };

  const result = await analyticsEstoqueService.getTopMovimentados(
    analyticsFilters,
    limite ? parseInt(limite as string, 10) : 20,
  );
  res.json({ data: result });
});

/** GET /inventory/analytics/tendencia-diaria?dataInicio=&dataFim= */
router.get('/analytics/tendencia-diaria', async (req, res) => {
  const filters = AnalyticsFiltersSchema.parse(req.query);
  const analyticsFilters: AnalyticsFilters = {
    clinicaId: req.clinica.id,
    ...(filters.dataInicio && { dataInicio: filters.dataInicio.toISOString() }),
    ...(filters.dataFim && { dataFim: filters.dataFim.toISOString() }),
    ...(filters.categoriaId && { categoriaId: filters.categoriaId }),
  };

  const result = await analyticsEstoqueService.getTendenciaDiaria(analyticsFilters);
  res.json({ data: result });
});

/** GET /inventory/analytics/previsao-ruptura?diasHistorico= */
router.get('/analytics/previsao-ruptura', async (req, res) => {
  const { diasHistorico } = req.query;
  const result = await analyticsEstoqueService.getPrevisaoRuptura(
    req.clinica.id,
    diasHistorico ? parseInt(diasHistorico as string, 10) : 30,
  );
  res.json({ data: result });
});

/** GET /inventory/analytics/categorias?dataInicio=&dataFim= */
router.get('/analytics/categorias', async (req, res) => {
  const filters = AnalyticsFiltersSchema.parse(req.query);
  const analyticsFilters: AnalyticsFilters = {
    clinicaId: req.clinica.id,
    ...(filters.dataInicio && { dataInicio: filters.dataInicio.toISOString() }),
    ...(filters.dataFim && { dataFim: filters.dataFim.toISOString() }),
    ...(filters.categoriaId && { categoriaId: filters.categoriaId }),
  };

  const result = await analyticsEstoqueService.getDistribuicaoCategorias(analyticsFilters);
  res.json({ data: result });
});


// --- CATEGORIAS ---
router.get('/categorias', async (req, res) => {
  const result = await produtosService.listCategorias(req.clinica.id);
  res.json(result);
});

router.post('/categorias', async (req, res) => {
  const result = await produtosService.createCategoria(req.clinica.id, req.body);
  res.json(result);
});

// --- PRODUTOS ---
router.get('/produtos', async (req, res) => {
  const filters = ListProdutosSchema.parse(req.query);
  const result = await produtosService.listProdutos(req.clinica.id, filters);
  res.json(result);
});

router.get('/produtos/:id', async (req, res) => {
  const result = await produtosService.getProduto(req.clinica.id, req.params['id']!);
  res.json(result);
});

router.post('/produtos', async (req, res) => {
  const result = await produtosService.createProduto(req.clinica.id, req.body);
  res.json(result);
});

router.put('/produtos/:id', async (req, res) => {
  const result = await produtosService.updateProduto(req.clinica.id, req.params['id']!, req.body);
  res.json(result);
});

// --- ESTOQUE & LOTES ---
router.get('/produtos/:id/lotes', async (req, res) => {
  const result = await estoqueService.listLotes(req.clinica.id, req.params['id']!);
  res.json(result);
});

router.get('/produtos/:id/movimentacoes', async (req, res) => {
  const { page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const [movimentacoes, total] = await Promise.all([
    prisma.movimentacaoEstoque.findMany({
      where: {
        clinicaId: req.clinica.id,
        produtoId: req.params['id']!
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
      take: parseInt(limit as string),
    }),
    prisma.movimentacaoEstoque.count({
      where: {
        clinicaId: req.clinica.id,
        produtoId: req.params['id']!
      },
    }),
  ]);

  res.json({
    data: movimentacoes.map(m => InventoryMapper.toMovimentacaoResponse(m)),
    meta: {
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  });
});

router.post('/lotes', async (req, res) => {
  const result = await estoqueService.createLote(req.clinica.id, {
    ...req.body,
    utilizadorId: req.user.id as string,
  });
  res.json({ data: result });
});

router.post('/movimentar', async (req, res) => {
  const result = await estoqueService.movimentar(req.clinica.id, {
    ...req.body,
    utilizadorId: req.user.id as string,
  });
  res.json({ data: result });
});

export default router;
