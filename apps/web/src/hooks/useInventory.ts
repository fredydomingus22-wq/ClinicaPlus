import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../api/client';
import { toast } from 'react-hot-toast';
import {
  type CreateCategoriaInput,
  type CreateProdutoInput,
  type UpdateProdutoInput,
  type CreateLoteInput,
  type MovimentarEstoqueInput,
} from '../schemas/inventory.schema';
import type {
  CategoriaResponse,
  ProdutoResponse,
  ProdutoListResponse,
  LoteComProdutoResponse,
  MovimentacaoResponse,
  ListProdutosInput,
  AnalyticsFiltersInput,
  KpiEstoqueResponse,
  TopMovimentadoItem,
  TendenciaEstoqueItem,
  PrevisaoRupturaItem,
  DistribuicaoCategoria,
} from '../types/inventory.types';

export const useInventory = () => {
  const queryClient = useQueryClient();

  // --- CATEGORIAS ---
  const useCategorias = () => {
    return useQuery({
      queryKey: ['inventory', 'categorias'],
      queryFn: async () => {
        const { data } = await api.get('/inventory/categorias');
        return data.data as CategoriaResponse[];
      },
    });
  };

  const useCreateCategoria = () => {
    return useMutation({
      mutationFn: async (data: CreateCategoriaInput) => {
        const { data: res } = await api.post('/inventory/categorias', data);
        return res.data as CategoriaResponse;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['inventory', 'categorias'] });
        toast.success('Categoria criada com sucesso');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Erro ao criar categoria');
      },
    });
  };

  // --- PRODUTOS ---
  const useProdutos = (filters: ListProdutosInput = {}) => {
    return useQuery({
      queryKey: ['inventory', 'produtos', filters],
      queryFn: async () => {
        const { data } = await api.get('/inventory/produtos', { params: filters });
        return data.data as ProdutoListResponse[];
      },
    });
  };

  const useProduto = (id: string) => {
    return useQuery({
      queryKey: ['inventory', 'produto', id],
      queryFn: async () => {
        const { data } = await api.get(`/inventory/produtos/${id}`);
        return data.data as ProdutoResponse;
      },
      enabled: !!id,
    });
  };

  const useCreateProduto = () => {
    return useMutation({
      mutationFn: async (data: CreateProdutoInput) => {
        const { data: res } = await api.post('/inventory/produtos', data);
        return res.data as ProdutoResponse;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['inventory', 'produtos'] });
        toast.success('Produto criado com sucesso');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Erro ao criar produto');
      },
    });
  };

  const useUpdateProduto = (id: string) => {
    return useMutation({
      mutationFn: async (data: UpdateProdutoInput) => {
        const { data: res } = await api.put(`/inventory/produtos/${id}`, data);
        return res.data as ProdutoResponse;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['inventory', 'produtos'] });
        queryClient.invalidateQueries({ queryKey: ['inventory', 'produto', id] });
        toast.success('Produto atualizado com sucesso');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Erro ao atualizar produto');
      },
    });
  };

  // --- ESTOQUE ---
  const useMovimentar = () => {
    return useMutation({
      mutationFn: async (data: MovimentarEstoqueInput) => {
        const { data: res } = await api.post('/inventory/movimentar', data);
        return res.data as MovimentacaoResponse;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['inventory', 'produtos'] });
        queryClient.invalidateQueries({ queryKey: ['inventory', 'produto', variables.produtoId] });
        toast.success('Movimentação registrada');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Erro ao registrar movimentação');
      },
    });
  };

  const useCreateLote = () => {
    return useMutation({
      mutationFn: async (data: CreateLoteInput & { utilizadorId?: string }) => {
        const { data: res } = await api.post('/inventory/lotes', data);
        return res.data as LoteComProdutoResponse;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['inventory', 'produto', variables.produtoId] });
        queryClient.invalidateQueries({ queryKey: ['inventory', 'lotes', variables.produtoId] });
        toast.success('Lote cadastrado');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Erro ao cadastrar lote');
      },
    });
  };

  const useLotes = (produtoId: string) => {
    return useQuery({
      queryKey: ['inventory', 'lotes', produtoId],
      queryFn: async () => {
        const { data } = await api.get(`/inventory/produtos/${produtoId}/lotes`);
        return data.data as LoteComProdutoResponse[];
      },
      enabled: !!produtoId,
    });
  };

  // --- ANALYTICS ---

  const useAnalyticsKpis = (filters: AnalyticsFiltersInput = {}) =>
    useQuery({
      queryKey: ['inventory', 'analytics', 'kpis', filters],
      queryFn: async () => {
        const params: Record<string, string> = {};
        if (filters.dataInicio) params.dataInicio = filters.dataInicio;
        if (filters.dataFim) params.dataFim = filters.dataFim;
        if (filters.categoriaId) params.categoriaId = filters.categoriaId;

        const { data } = await api.get('/inventory/analytics/kpis', { params });
        return data.data as KpiEstoqueResponse;
      },
    });

  const useTopMovimentados = (filters: AnalyticsFiltersInput & { limite?: number } = {}) =>
    useQuery({
      queryKey: ['inventory', 'analytics', 'top', filters],
      queryFn: async () => {
        const params: Record<string, string | number> = {};
        if (filters.dataInicio) params.dataInicio = filters.dataInicio;
        if (filters.dataFim) params.dataFim = filters.dataFim;
        if (filters.categoriaId) params.categoriaId = filters.categoriaId;
        if (filters.limite) params.limite = filters.limite;

        const { data } = await api.get('/inventory/analytics/top-movimentados', { params });
        return data.data as TopMovimentadoItem[];
      },
    });

  const useTendenciaDiaria = (filters: AnalyticsFiltersInput = {}) =>
    useQuery({
      queryKey: ['inventory', 'analytics', 'tendencia', filters],
      queryFn: async () => {
        const params: Record<string, string> = {};
        if (filters.dataInicio) params.dataInicio = filters.dataInicio;
        if (filters.dataFim) params.dataFim = filters.dataFim;
        if (filters.categoriaId) params.categoriaId = filters.categoriaId;

        const { data } = await api.get('/inventory/analytics/tendencia-diaria', { params });
        return data.data as TendenciaEstoqueItem[];
      },
    });

  const usePrevisaoRuptura = (diasHistorico = 30) =>
    useQuery({
      queryKey: ['inventory', 'analytics', 'ruptura', diasHistorico],
      queryFn: async () => {
        const { data } = await api.get('/inventory/analytics/previsao-ruptura', { params: { diasHistorico } });
        return data.data as PrevisaoRupturaItem[];
      },
    });

  const useDistribuicaoCategorias = (filters: AnalyticsFiltersInput = {}) =>
    useQuery({
      queryKey: ['inventory', 'analytics', 'categorias', filters],
      queryFn: async () => {
        const params: Record<string, string> = {};
        if (filters.dataInicio) params.dataInicio = filters.dataInicio;
        if (filters.dataFim) params.dataFim = filters.dataFim;

        const { data } = await api.get('/inventory/analytics/categorias', { params });
        return data.data as DistribuicaoCategoria[];
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
    useLotes,
    // analytics
    useAnalyticsKpis,
    useTopMovimentados,
    useTendenciaDiaria,
    usePrevisaoRuptura,
    useDistribuicaoCategorias,
  };
};
