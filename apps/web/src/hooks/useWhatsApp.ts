import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappApi } from '../api/whatsapp';
import { toast } from 'react-hot-toast';
import { useSocketEvent } from './useSocketEvent';
import { useCallback } from 'react';

export const whatsappKeys = {
  all: ['whatsapp'] as const,
  instancias: () => [...whatsappKeys.all, 'instancias'] as const,
  status: (id: string) => [...whatsappKeys.instancias(), 'status', id] as const,
  qrcode: (id: string) => [...whatsappKeys.instancias(), 'qrcode', id] as const,
  automacoes: (instanciaId?: string) => {
    const base = [...whatsappKeys.all, 'automacoes'];
    if (instanciaId) base.push(instanciaId);
    return base;
  },
  templates: () => [...whatsappKeys.all, 'templates'] as const,
  actividade: () => [...whatsappKeys.all, 'actividade'] as const,
  metricas: () => [...whatsappKeys.all, 'metricas'] as const,
};

export function useWhatsApp() {
  const queryClient = useQueryClient();

  // 1. Queries
  const instanciasQuery = useQuery({
    queryKey: whatsappKeys.instancias(),
    queryFn: whatsappApi.listarInstancias,
  });

  const automacoesQuery = useQuery({
    queryKey: whatsappKeys.automacoes(),
    queryFn: () => whatsappApi.listarAutomacoes(),
  });

  const templatesQuery = useQuery({
    queryKey: whatsappKeys.templates(),
    queryFn: whatsappApi.listarTemplates,
  });

  const actividadeQuery = useQuery({
    queryKey: whatsappKeys.actividade(),
    queryFn: whatsappApi.getActividade,
  });

  const metricasQuery = useQuery({
    queryKey: whatsappKeys.metricas(),
    queryFn: whatsappApi.getMetricas,
  });

  // 2. Mutations
  const criarMutation = useMutation({
    mutationFn: whatsappApi.conectar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.instancias() });
      toast.success('Nova instância iniciada.');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: string) => whatsappApi.desligar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.instancias() });
      toast.success('Instância eliminada.');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => 
      active ? whatsappApi.activarAutomacao(id) : whatsappApi.desactivarAutomacao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.automacoes() });
    },
  });

  const adicionarMutation = useMutation({
    mutationFn: (data: { tipo: string; waInstanciaId: string }) => 
      whatsappApi.adicionarAutomacao(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.automacoes() });
      toast.success('Automação adicionada.');
    },
  });

  const configurarMutation = useMutation({
    mutationFn: ({ id, config }: { id: string; config: Record<string, unknown> }) => 
      whatsappApi.configurarAutomacao(id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.automacoes() });
      toast.success('Configuração guardada.');
    },
    onError: () => {
      toast.error('Erro ao guardar configuração.');
    }
  });

  const refetchQrMutation = useMutation({
    mutationFn: (id: string) => whatsappApi.getQrCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.instancias() });
    },
    onError: () => {
      toast.error('Erro ao buscar QR Code. Tenta novamente.');
    }
  });

  // 3. Realtime Updates
  const handleStatusUpdate = useCallback((data: { instanciaId: string, estado: string }) => {
    queryClient.invalidateQueries({ queryKey: whatsappKeys.instancias() });
    if (data.estado === 'CONECTADO') {
      toast.success('WhatsApp conectado!', { id: `wa-conn-${data.instanciaId}` });
    }
  }, [queryClient]);

  const handleQrUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: whatsappKeys.instancias() });
  }, [queryClient]);

  useSocketEvent('whatsapp:estado', handleStatusUpdate);
  useSocketEvent('whatsapp:qrcode', handleQrUpdate);

  return {
    instancias: Array.isArray(instanciasQuery.data) ? instanciasQuery.data : [],
    automacoes: Array.isArray(automacoesQuery.data) ? automacoesQuery.data : [],
    templates: Array.isArray(templatesQuery.data) ? templatesQuery.data : [],
    actividade: Array.isArray(actividadeQuery.data) ? actividadeQuery.data : [],
    metricas: metricasQuery.data,
    isLoading: instanciasQuery.isLoading || automacoesQuery.isLoading || templatesQuery.isLoading,
    
    // Actions
    criarInstancia: () => criarMutation.mutate(),
    eliminarInstancia: (id: string) => eliminarMutation.mutate(id),
    actualizarAutomacao: (id: string, active: boolean) => toggleMutation.mutate({ id, active }),
    adicionarAutomacao: (tipo: string, waInstanciaId: string) => 
      adicionarMutation.mutate({ tipo, waInstanciaId }),
    configurarAutomacao: (id: string, config: Record<string, unknown>) => 
      configurarMutation.mutate({ id, config }),
    refetchQrCode: (id: string) => refetchQrMutation.mutate(id),
    
    // Loading states
    criando: criarMutation.isPending || refetchQrMutation.isPending,
    eliminando: eliminarMutation.isPending,
    toggling: toggleMutation.isPending,
    adicionando: adicionarMutation.isPending,
    configurando: configurarMutation.isPending,
  };
}

/**
 * Hook auxiliar para obter QR Code de uma instância específica
 */
export function useWhatsAppQrCode(instanciaId: string, enabled: boolean) {
  return useQuery({
    queryKey: whatsappKeys.qrcode(instanciaId),
    queryFn: () => whatsappApi.getQrCode(instanciaId),
    enabled: !!instanciaId && enabled,
    refetchInterval: 5000,
  });
}

/**
 * Hook auxiliar para sincronizar o estado da conexão (fallback para webhooks)
 */
export function useWhatsAppStatus(instanciaId: string, enabled: boolean) {
  return useQuery({
    queryKey: whatsappKeys.status(instanciaId),
    queryFn: () => whatsappApi.getEstado(instanciaId),
    enabled: !!instanciaId && enabled,
    refetchInterval: 5000,
  });
}
