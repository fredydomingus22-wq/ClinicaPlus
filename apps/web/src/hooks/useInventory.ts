import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../api/client';
import { TipoProduto, ProdutoDTO, CategoriaProdutoDTO } from '@clinicaplus/types';
import { toast } from 'react-hot-toast';

export const useInventory = () => {
  const queryClient = useQueryClient();

  // --- CATEGORIAS ---
  const useCategorias = () => {
    return useQuery({
      queryKey: ['inventory', 'categorias'],
      queryFn: async () => {
        const { data } = await api.get('/inventory/categorias');
        return data.data as CategoriaProdutoDTO[];
      },
    });
  };

  const useCreateCategoria = () => {
    return useMutation({
      mutationFn: async (data: Partial<CategoriaProdutoDTO>) => {
        const { data: res } = await api.post('/inventory/categorias', data);
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['inventory', 'categorias'] });
        toast.success('Categoria criada com sucesso');
      },
    });
  };

  // --- PRODUTOS ---
  const useProdutos = (filters: { categoriaId?: string; tipo?: TipoProduto; busca?: string } = {}) => {
    return useQuery({
      queryKey: ['inventory', 'produtos', filters],
      queryFn: async () => {
        const { data } = await api.get('/inventory/produtos', { params: filters });
        return data.data as ProdutoDTO[];
      },
    });
  };

  const useProduto = (id: string) => {
    return useQuery({
      queryKey: ['inventory', 'produto', id],
      queryFn: async () => {
        const { data } = await api.get(`/inventory/produtos/${id}`);
        return data.data as ProdutoDTO;
      },
      enabled: !!id,
    });
  };

  const useCreateProduto = () => {
    return useMutation({
      mutationFn: async (data: any) => {
        const { data: res } = await api.post('/inventory/produtos', data);
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['inventory', 'produtos'] });
        toast.success('Produto criado com sucesso');
      },
    });
  };

  const useUpdateProduto = (id: string) => {
    return useMutation({
      mutationFn: async (data: any) => {
        const { data: res } = await api.put(`/inventory/produtos/${id}`, data);
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['inventory', 'produtos'] });
        queryClient.invalidateQueries({ queryKey: ['inventory', 'produto', id] });
        toast.success('Produto atualizado com sucesso');
      },
    });
  };

  // --- ESTOQUE ---
  const useMovimentar = () => {
    return useMutation({
      mutationFn: async (data: any) => {
        const { data: res } = await api.post('/inventory/movimentar', data);
        return res.data;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['inventory', 'produtos'] });
        queryClient.invalidateQueries({ queryKey: ['inventory', 'produto', variables.produtoId] });
        toast.success('Movimentação registrada');
      },
    });
  };

  const useCreateLote = () => {
    return useMutation({
      mutationFn: async (data: any) => {
        const { data: res } = await api.post('/inventory/lotes', data);
        return res.data;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['inventory', 'produto', variables.produtoId] });
        toast.success('Lote cadastrado');
      },
    });
  };

  // --- ANALYTICS ---

  const useAnalyticsKpis = (filters: { dataInicio?: string; dataFim?: string; categoriaId?: string } = {}) =>
    useQuery({
      queryKey: ['inventory', 'analytics', 'kpis', filters],
      queryFn: async () => {
        const params: any = {};
        if (filters.dataInicio) params.dataInicio = filters.dataInicio;
        if (filters.dataFim) params.dataFim = filters.dataFim;
        if (filters.categoriaId) params.categoriaId = filters.categoriaId;

        const { data } = await api.get('/inventory/analytics/kpis', { params });
        return data.data as {
          totalProdutos: number; totalServicos: number; valorTotalEstoque: number;
          itensAbaixoMinimo: number; itensComValidade30d: number; itensComValidade60d: number;
          taxaRotatividade: number; diasEstoque: number; taxaRuptura: number;
        };
      },
    });

  const useTopMovimentados = (filters: { dataInicio?: string; dataFim?: string; categoriaId?: string; limite?: number } = {}) =>
    useQuery({
      queryKey: ['inventory', 'analytics', 'top', filters],
      queryFn: async () => {
        const params: any = { ...filters };
        // Clean up undefined to satisfy exactOptionalPropertyTypes if needed, though spreading is usually okay if the target allows it.
        // But let's be explicit to be safe since the API client might be strict.
        Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

        const { data } = await api.get('/inventory/analytics/top-movimentados', { params });
        return data.data as Array<{
          produtoId: string; nome: string; codigo: string | null; categoria: string; tipo: string;
          totalSaidas: number; totalEntradas: number; totalMovimentacoes: number;
          receita: number; classificacaoAbc: 'A' | 'B' | 'C';
        }>;
      },
    });

  const useTendenciaDiaria = (filters: { dataInicio?: string; dataFim?: string; categoriaId?: string } = {}) =>
    useQuery({
      queryKey: ['inventory', 'analytics', 'tendencia', filters],
      queryFn: async () => {
        const { data } = await api.get('/inventory/analytics/tendencia-diaria', { params: filters });
        return data.data as Array<{ data: string; entradas: number; saidas: number; saldoAcumulado: number }>;
      },
    });

  const usePrevisaoRuptura = (diasHistorico = 30) =>
    useQuery({
      queryKey: ['inventory', 'analytics', 'ruptura', diasHistorico],
      queryFn: async () => {
        const { data } = await api.get('/inventory/analytics/previsao-ruptura', { params: { diasHistorico } });
        return data.data as Array<{
          produtoId: string; nome: string; estoqueAtual: number;
          consumoMedioDiario: number; diasAteRuptura: number | null;
          dataEstimadaRuptura: string | null; criticidade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'OK';
        }>;
      },
    });

  const useDistribuicaoCategorias = (filters: { dataInicio?: string; dataFim?: string } = {}) =>
    useQuery({
      queryKey: ['inventory', 'analytics', 'categorias', filters],
      queryFn: async () => {
        const { data } = await api.get('/inventory/analytics/categorias', { params: filters });
        return data.data as Array<{
          categoriaId: string; nome: string; cor: string | null;
          totalItens: number; valorEstoque: number; movimentacoes: number;
        }>;
      },
    });

  return {
    useCategorias,
    useCreateCategoria,
    useProdutos,
    useProduto,
    useCreateProduto,
    useUpdateProduto,
    useMovimentar,
    useCreateLote,
    // analytics
    useAnalyticsKpis,
    useTopMovimentados,
    useTendenciaDiaria,
    usePrevisaoRuptura,
    useDistribuicaoCategorias,
  };
};
