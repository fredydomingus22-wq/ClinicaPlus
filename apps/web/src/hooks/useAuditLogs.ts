import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

interface AuditLogsResponse {
  success: boolean;
  data: any[];
  pagination: any;
}

export function useAuditLogs(filters: {
  actorId?: string;
  accao?: string;
  recurso?: string;
  recursoId?: string;
  inicio?: string;
  fim?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<AuditLogsResponse>('/audit-logs', {
        params: filters,
      });
      return data;
    },
  });
}
