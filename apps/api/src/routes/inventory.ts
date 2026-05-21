import { Router } from 'express';
import { produtosService } from '../services/produtos.service';
import { estoqueService } from '../services/estoque.service';
import { analyticsEstoqueService, AnalyticsFilters } from '../services/analytics.estoque.service';
import { TipoProduto } from '@clinicaplus/types';

const router = Router();

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

/** GET /inventory/analytics/kpis?dataInicio=&dataFim=&categoriaId= */
router.get('/analytics/kpis', async (req, res) => {
  const { dataInicio, dataFim, categoriaId } = req.query;
  const filters: AnalyticsFilters = { clinicaId: req.clinica.id };
  if (dataInicio) filters.dataInicio = dataInicio as string;
  if (dataFim) filters.dataFim = dataFim as string;
  if (categoriaId) filters.categoriaId = categoriaId as string;

  const result = await analyticsEstoqueService.getKpis(filters);
  res.json({ data: result });
});

/** GET /inventory/analytics/top-movimentados?dataInicio=&dataFim=&limite= */
router.get('/analytics/top-movimentados', async (req, res) => {
  const { dataInicio, dataFim, categoriaId, limite } = req.query;
  const filters: AnalyticsFilters = { clinicaId: req.clinica.id };
  if (dataInicio) filters.dataInicio = dataInicio as string;
  if (dataFim) filters.dataFim = dataFim as string;
  if (categoriaId) filters.categoriaId = categoriaId as string;

  const result = await analyticsEstoqueService.getTopMovimentados(
    filters,
    limite ? parseInt(limite as string, 10) : 20,
  );
  res.json({ data: result });
});

/** GET /inventory/analytics/tendencia-diaria?dataInicio=&dataFim= */
router.get('/analytics/tendencia-diaria', async (req, res) => {
  const { dataInicio, dataFim, categoriaId } = req.query;
  const filters: AnalyticsFilters = { clinicaId: req.clinica.id };
  if (dataInicio) filters.dataInicio = dataInicio as string;
  if (dataFim) filters.dataFim = dataFim as string;
  if (categoriaId) filters.categoriaId = categoriaId as string;

  const result = await analyticsEstoqueService.getTendenciaDiaria(filters);
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
  const { dataInicio, dataFim } = req.query;
  const filters: AnalyticsFilters = { clinicaId: req.clinica.id };
  if (dataInicio) filters.dataInicio = dataInicio as string;
  if (dataFim) filters.dataFim = dataFim as string;

  const result = await analyticsEstoqueService.getDistribuicaoCategorias(filters);
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
  const { categoriaId, tipo, busca } = req.query;
  const result = await produtosService.listProdutos(req.clinica.id, {
    categoriaId: categoriaId as string,
    tipo: tipo as TipoProduto,
    busca: busca as string,
  });
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
