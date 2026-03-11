import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { FaturaDTO, SubscriptionStatusDTO } from '@clinicaplus/types';

/**
 * Hook to fetch the billing history for the current clinic.
 */
export function useBillingHistory() {
  return useQuery({
    queryKey: ['billing', 'history'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: FaturaDTO[] }>('/billing/history');
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch the current subscription status.
 */
export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: SubscriptionStatusDTO }>('/billing/subscription');
      return response.data.data;
    },
  });
}
