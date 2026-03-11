import { QueryClient } from '@tanstack/react-query';

/**
 * Global TanStack Query client configuration.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      gcTime: 5 * 60_000, // 5 minutes
      retry: (failureCount, error: unknown) => {
        // Don't retry auth errors or common client errors
        const err = error as { response?: { status: number } };
        if (err?.response?.status === 401) return false;
        if (err?.response?.status === 404) return false;
        if (err?.response?.status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
