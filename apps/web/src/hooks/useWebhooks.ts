import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { webhooksApi } from '../api/webhooks';
import { WebhookCreateInput, WebhookUpdateInput } from '@clinicaplus/types';
import { toast } from 'react-hot-toast';

export const webhooksKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhooksKeys.all, 'list'] as const,
  deliveries: (id: string) => [...webhooksKeys.all, 'deliveries', id] as const,
};

export function useWebhooks() {
  return useQuery({
    queryKey: webhooksKeys.lists(),
    queryFn: webhooksApi.getList,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WebhookCreateInput) => webhooksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhooksKeys.lists() });
      toast.success('Webhook criado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar webhook');
    }
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WebhookUpdateInput }) => webhooksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhooksKeys.lists() });
      toast.success('Webhook atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar webhook');
    }
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => webhooksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhooksKeys.lists() });
      toast.success('Webhook removido');
    },
    onError: () => {
      toast.error('Erro ao remover webhook');
    }
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (id: string) => webhooksApi.test(id),
    onSuccess: () => {
      toast.success('Evento de teste enfileirado');
    },
    onError: () => {
      toast.error('Erro ao testar webhook');
    }
  });
}

export function useWebhookEntregas(id: string) {
  return useQuery({
    queryKey: webhooksKeys.deliveries(id),
    queryFn: () => webhooksApi.getEntregas(id),
    enabled: !!id,
  });
}

export function useReenviarEntrega() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ webhookId, entregaId }: { webhookId: string; entregaId: string }) => 
      webhooksApi.reenviar(webhookId, entregaId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: webhooksKeys.deliveries(variables.webhookId) });
      toast.success('Reenvio enfileirado');
    },
    onError: () => {
      toast.error('Erro ao reenviar');
    }
  });
}
