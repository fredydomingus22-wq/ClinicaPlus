import { prisma } from '../lib/prisma';
import { subDays, startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';
import { estoqueCalculoService } from './estoque.calculo.service';

export interface AnalyticsFilters {
  clinicaId: string;
  /** ISO date string. Defaults to 30 days ago */
  dataInicio?: string;
  /** ISO date string. Defaults to today */
  dataFim?: string;
  categoriaId?: string;
}

// ─────────────────────────────────────────────────────────────
// INTERFACES DE RESPOSTA
// ─────────────────────────────────────────────────────────────

export interface KpiEstoqueResponse {
  totalProdutos: number;
  totalServicos: number;
  valorTotalEstoque: number;
  itensAbaixoMinimo: number;
  itensComValidade30d: number;
  itensComValidade60d: number;
  taxaRotatividade: number; // Inventory Turnover Ratio
  diasEstoque: number;     // Days Sales of Inventory (DSI)
  taxaRuptura: number;     // Stock-out rate %
}

export interface TopMovimentadoItem {
  produtoId: string;
  nome: string;
  codigo: string | null;
  categoria: string;
  tipo: string;
  totalSaidas: number;
  totalEntradas: number;
  totalMovimentacoes: number;
  receita: number; // total vendas em Kz
  classificacaoAbc: 'A' | 'B' | 'C';
}

export interface TendenciaEstoqueItem {
  data: string;      // YYYY-MM-DD
  entradas: number;
  saidas: number;
  saldoAcumulado: number;
}

export interface PrevisaoRupturaItem {
  produtoId: string;
  nome: string;
  estoqueAtual: number;
  consumoMedioDiario: number;
  diasAteRuptura: number | null; // null = suficiente pra mais de 365 dias
  dataEstimadaRuptura: string | null;
  criticidade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'OK';
}

export interface DistribuicaoCategoria {
  categoriaId: string;
  nome: string;
  cor: string | null;
  totalItens: number;
  valorEstoque: number;
  movimentacoes: number;
}

// ─────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────

export const analyticsEstoqueService = {

  /**
   * Retorna os KPIs principais do controle de estoque.
   */
  async getKpis(filters: AnalyticsFilters): Promise<KpiEstoqueResponse> {
    const { clinicaId, dataInicio, dataFim } = filters;
    const inicio = dataInicio ? new Date(dataInicio) : subDays(new Date(), 30);
    const fim = dataFim ? new Date(dataFim) : new Date();

    const [produtos, movimentacoes, lotes] = await Promise.all([
      prisma.produto.findMany({
        where: {
          clinicaId,
          ativo: true,
          ...(filters.categoriaId ? { categoriaId: filters.categoriaId } : {}),
        },
        select: {
          id: true,
          tipo: true,
          gerenciaEstoque: true,
          estoqueMinimo: true,
          precoCusto: true,
        },
      }),
      prisma.movimentacaoEstoque.findMany({
        where: {
          clinicaId,
          criadoEm: { gte: inicio, lte: fim },
          ...(filters.categoriaId ? { produto: { categoriaId: filters.categoriaId } } : {}),
        },
        select: { tipo: true, quantidade: true },
      }),
      prisma.estoqueLote.findMany({
        where: {
          clinicaId,
          quantidade: { gt: 0 },
          ...(filters.categoriaId ? { produto: { categoriaId: filters.categoriaId } } : {}),
        },
        select: {
          produtoId: true,
          quantidade: true,
          dataValidade: true,
          produto: { select: { precoCusto: true } },
        },
      }),
    ]);

    const totalProdutos = produtos.filter(p => p.tipo === 'PRODUTO').length;
    const totalServicos = produtos.filter(p => p.tipo === 'SERVICO').length;

    // Valor total do estoque usando service centralizado
    const produtoIds = produtos.map(p => p.id);
    const valorEstoqueBatch = await estoqueCalculoService.calcularValorEstoqueBatch(clinicaId, produtoIds);
    const valorTotalEstoque = Object.values(valorEstoqueBatch).reduce((a, b) => a + b, 0);

    // Estoque atual por produto usando service centralizado
    const estoqueBatch = await estoqueCalculoService.calcularEstoqueBatch(clinicaId, produtoIds);

    // Itens abaixo do mínimo
    const itensAbaixoMinimo = produtos.filter(
      p => p.gerenciaEstoque && (estoqueBatch[p.id] || 0) <= p.estoqueMinimo
    ).length;

    // Validades críticas
    const agora = new Date();
    const daqui30 = new Date(agora.getTime() + 30 * 86400000);
    const daqui60 = new Date(agora.getTime() + 60 * 86400000);
    const itensComValidade30d = lotes.filter(l => l.dataValidade && l.dataValidade <= daqui30 && l.dataValidade >= agora).length;
    const itensComValidade60d = lotes.filter(l => l.dataValidade && l.dataValidade <= daqui60 && l.dataValidade >= agora).length;

    // Inventory Turnover Ratio: totalSaidas / mediaEstoque
    const totalSaidasPeriodo = movimentacoes
      .filter(m => m.tipo === 'SAIDA' || m.tipo === 'VENDA')
      .reduce((acc, m) => acc + m.quantidade, 0);

    const mediaEstoque = valorTotalEstoque > 0 ? valorTotalEstoque : 1;
    const taxaRotatividade = parseFloat((totalSaidasPeriodo / (mediaEstoque / 1000)).toFixed(2));

    // DSI: quantos dias o estoque cobre com o ritmo atual
    const diasPeriodo = Math.max(1, Math.ceil((fim.getTime() - inicio.getTime()) / 86400000));
    const consumoDiarioMedio = totalSaidasPeriodo / diasPeriodo;
    const estoqueAggregado = Object.values(estoqueBatch).reduce((a, b) => a + b, 0);
    const diasEstoque = consumoDiarioMedio > 0 ? parseFloat((estoqueAggregado / consumoDiarioMedio).toFixed(1)) : 999;

    // Taxa de ruptura usando service centralizado
    const produtosComEstoque = produtos.filter(p => p.gerenciaEstoque);
    const comRuptura = produtosComEstoque.filter(p => (estoqueBatch[p.id] || 0) === 0).length;
    const taxaRuptura = produtosComEstoque.length > 0
      ? parseFloat(((comRuptura / produtosComEstoque.length) * 100).toFixed(1))
      : 0;

    return {
      totalProdutos,
      totalServicos,
      valorTotalEstoque,
      itensAbaixoMinimo,
      itensComValidade30d,
      itensComValidade60d,
      taxaRotatividade,
      diasEstoque,
      taxaRuptura,
    };
  },

  /**
   * Os N itens mais movimentados no período com classificação ABC.
   * Classificação Pareto: A=top 20%, B=seguintes 30%, C=restantes 50% (por receita).
   */
  async getTopMovimentados(filters: AnalyticsFilters, limite = 20): Promise<TopMovimentadoItem[]> {
    const { clinicaId, dataInicio, dataFim } = filters;
    const inicio = dataInicio ? new Date(dataInicio) : subDays(new Date(), 30);
    const fim = dataFim ? new Date(dataFim) : new Date();

    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: {
        clinicaId,
        criadoEm: { gte: inicio, lte: fim },
        ...(filters.categoriaId ? { produto: { categoriaId: filters.categoriaId } } : {}),
      },
      select: {
        produtoId: true,
        tipo: true,
        quantidade: true,
        produto: {
          select: {
            id: true,
            nome: true,
            codigo: true,
            tipo: true,
            precoVenda: true,
            categoria: { select: { nome: true } },
          },
        },
      },
    });

    // Agregar por produto
    const agregado: Record<string, {
      produto: typeof movimentacoes[0]['produto'];
      saidas: number;
      entradas: number;
      total: number;
      receita: number;
    }> = {};

    for (const m of movimentacoes) {
      const pid = m.produtoId;
      if (!agregado[pid]) {
        agregado[pid] = { produto: m.produto, saidas: 0, entradas: 0, total: 0, receita: 0 };
      }
      agregado[pid].total += 1;
      if (m.tipo === 'SAIDA' || m.tipo === 'VENDA') {
        agregado[pid].saidas += m.quantidade;
        agregado[pid].receita += m.quantidade * m.produto.precoVenda;
      } else if (m.tipo === 'ENTRADA') {
        agregado[pid].entradas += m.quantidade;
      }
    }

    const items = Object.values(agregado).sort((a, b) => b.receita - a.receita);

    // ABC: Pareto por receita acumulada
    const totalReceita = items.reduce((s, i) => s + i.receita, 0);
    let acumulado = 0;

    const result: TopMovimentadoItem[] = items.slice(0, limite).map((item) => {
      acumulado += item.receita;
      const pct = totalReceita > 0 ? acumulado / totalReceita : 0;
      let classificacaoAbc: 'A' | 'B' | 'C' = 'C';
      if (pct <= 0.8) classificacaoAbc = 'A';
      else if (pct <= 0.95) classificacaoAbc = 'B';

      return {
        produtoId: item.produto.id,
        nome: item.produto.nome,
        codigo: item.produto.codigo,
        categoria: item.produto.categoria?.nome ?? '',
        tipo: item.produto.tipo,
        totalSaidas: item.saidas,
        totalEntradas: item.entradas,
        totalMovimentacoes: item.total,
        receita: item.receita,
        classificacaoAbc,
      };
    });

    return result;
  },

  /**
   * Tendência diária de entradas vs. saídas no período.
   * Útil para gráfico de linhas/área temporal.
   */
  async getTendenciaDiaria(filters: AnalyticsFilters): Promise<TendenciaEstoqueItem[]> {
    const { clinicaId, dataInicio, dataFim } = filters;
    const inicio = dataInicio ? startOfDay(new Date(dataInicio)) : startOfDay(subDays(new Date(), 30));
    const fim = dataFim ? endOfDay(new Date(dataFim)) : endOfDay(new Date());

    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: {
        clinicaId,
        criadoEm: { gte: inicio, lte: fim },
        ...(filters.categoriaId ? { produto: { categoriaId: filters.categoriaId } } : {}),
      },
      select: { tipo: true, quantidade: true, criadoEm: true },
      orderBy: { criadoEm: 'asc' },
    });

    // Montar mapa por dia
    const dias = eachDayOfInterval({ start: inicio, end: fim });
    const mapaEntradas: Record<string, number> = {};
    const mapaSaidas: Record<string, number> = {};

    for (const m of movimentacoes) {
      const key = format(m.criadoEm, 'yyyy-MM-dd');
      if (m.tipo === 'ENTRADA') {
        mapaEntradas[key] = (mapaEntradas[key] || 0) + m.quantidade;
      } else if (m.tipo === 'SAIDA' || m.tipo === 'VENDA') {
        mapaSaidas[key] = (mapaSaidas[key] || 0) + m.quantidade;
      }
    }

    let saldoAcumulado = 0;
    return dias.map(d => {
      const key = format(d, 'yyyy-MM-dd');
      const entradas = mapaEntradas[key] || 0;
      const saidas = mapaSaidas[key] || 0;
      saldoAcumulado += entradas - saidas;
      return { data: key, entradas, saidas, saldoAcumulado };
    });
  },

  /**
   * Previsão de ruptura de estoque por produto.
   * Usa média móvel de consumo dos últimos N dias para estimar quando o estoque zera.
   */
  async getPrevisaoRuptura(clinicaId: string, diasHistorico = 30): Promise<PrevisaoRupturaItem[]> {
    const inicio = subDays(new Date(), diasHistorico);

    const [produtos, movimentacoes] = await Promise.all([
      prisma.produto.findMany({
        where: { clinicaId, ativo: true, gerenciaEstoque: true },
        select: { id: true, nome: true },
      }),
      prisma.movimentacaoEstoque.findMany({
        where: {
          clinicaId,
          criadoEm: { gte: inicio },
          tipo: { in: ['SAIDA', 'VENDA'] },
        },
        select: { produtoId: true, quantidade: true },
      }),
    ]);

    // Estoque atual por produto usando service centralizado
    const produtoIds = produtos.map(p => p.id);
    const estoqueAtual = await estoqueCalculoService.calcularEstoqueBatch(clinicaId, produtoIds);

    // Consumo total no período por produto
    const consumoPeriodo: Record<string, number> = {};
    for (const m of movimentacoes) {
      consumoPeriodo[m.produtoId] = (consumoPeriodo[m.produtoId] || 0) + m.quantidade;
    }

    return produtos
      .map(p => {
        const atual = estoqueAtual[p.id] || 0;
        const consumoTotal = consumoPeriodo[p.id] || 0;
        const consumoMedioDiario = parseFloat((consumoTotal / diasHistorico).toFixed(4));

        let diasAteRuptura: number | null = null;
        let dataEstimadaRuptura: string | null = null;

        if (consumoMedioDiario > 0) {
          const dias = Math.floor(atual / consumoMedioDiario);
          diasAteRuptura = dias <= 365 ? dias : null;
          if (diasAteRuptura !== null) {
            const data = new Date();
            data.setDate(data.getDate() + diasAteRuptura);
            dataEstimadaRuptura = format(data, 'yyyy-MM-dd');
          }
        }

        let criticidade: PrevisaoRupturaItem['criticidade'] = 'OK';
        if (atual === 0) criticidade = 'CRITICA';
        else if (diasAteRuptura !== null && diasAteRuptura <= 7) criticidade = 'ALTA';
        else if (diasAteRuptura !== null && diasAteRuptura <= 30) criticidade = 'MEDIA';

        return {
          produtoId: p.id,
          nome: p.nome,
          estoqueAtual: atual,
          consumoMedioDiario,
          diasAteRuptura,
          dataEstimadaRuptura,
          criticidade,
        };
      })
      .sort((a, b) => {
        // Ordenar: CRITICA > ALTA > MEDIA > OK, depois dias crescentes
        const ordem = { CRITICA: 0, ALTA: 1, MEDIA: 2, OK: 3 };
        if (ordem[a.criticidade] !== ordem[b.criticidade]) return ordem[a.criticidade] - ordem[b.criticidade];
        return (a.diasAteRuptura ?? 9999) - (b.diasAteRuptura ?? 9999);
      });
  },

  /**
   * Distribuição do valor de estoque e movimentações por categoria.
   */
  async getDistribuicaoCategorias(filters: AnalyticsFilters): Promise<DistribuicaoCategoria[]> {
    const { clinicaId, dataInicio, dataFim } = filters;
    const inicio = dataInicio ? new Date(dataInicio) : subDays(new Date(), 30);
    const fim = dataFim ? new Date(dataFim) : new Date();

    const [categorias, lotes, movimentacoes] = await Promise.all([
      prisma.categoriaProduto.findMany({
        where: { clinicaId, ativo: true },
        select: { id: true, nome: true, cor: true },
      }),
      prisma.estoqueLote.findMany({
        where: { clinicaId, quantidade: { gt: 0 } },
        select: {
          produtoId: true,
          quantidade: true,
          produto: { select: { categoriaId: true, precoCusto: true } },
        },
      }),
      prisma.movimentacaoEstoque.findMany({
        where: { clinicaId, criadoEm: { gte: inicio, lte: fim } },
        select: { produtoId: true },
      }),
    ]);

    const valorPorCategoria: Record<string, number> = {};
    for (const l of lotes) {
      const cid = l.produto.categoriaId;
      valorPorCategoria[cid] = (valorPorCategoria[cid] || 0) + l.quantidade * l.produto.precoCusto;
    }

    const movPorCategoria: Record<string, number> = {};
    // TODO: Implement category-based movement counting when needed
    // for (const m of movimentacoes) {
    //   // Precisamos buscar a categoriaId do produto
    //   // Para otimizar, podemos fazer uma query separada
    // }

    // @ts-expect-error - Prisma groupBy return types are complex and can mismatch with strict TS
    const itensPorCategoria = await prisma.produto.groupBy({
      by: ['categoriaId'],
      where: { clinicaId, ativo: true },
      _count: { id: true },
    }) as Array<{ categoriaId: string; _count: { id: number } }>;

    const contagem: Record<string, number> = {};
    for (const r of itensPorCategoria) {
      contagem[r.categoriaId] = r._count.id;
    }

    // Buscar movimentações por categoria de forma otimizada
    const produtoIds = movimentacoes.map(m => m.produtoId);
    const produtosParaMov = await prisma.produto.findMany({
      where: { id: { in: produtoIds } },
      select: { id: true, categoriaId: true },
    });

    const produtoCategoriaMap: Record<string, string> = {};
    for (const p of produtosParaMov) {
      produtoCategoriaMap[p.id] = p.categoriaId;
    }

    for (const m of movimentacoes) {
      const cid = produtoCategoriaMap[m.produtoId];
      if (cid) {
        movPorCategoria[cid] = (movPorCategoria[cid] || 0) + 1;
      }
    }

    return categorias.map(c => ({
      categoriaId: c.id,
      nome: c.nome,
      cor: c.cor,
      totalItens: contagem[c.id] || 0,
      valorEstoque: valorPorCategoria[c.id] || 0,
      movimentacoes: movPorCategoria[c.id] || 0,
    })).filter(c => c.totalItens > 0);
  },
};
