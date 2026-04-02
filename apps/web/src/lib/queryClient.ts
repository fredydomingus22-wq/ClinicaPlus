import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { del, get, set } from 'idb-keyval';

/**
 * Persister baseado em IndexedDB.
 * Capacidade: 50-100MB+ (vs ~5MB do localStorage).
 * Assíncrono: não bloqueia o main thread.
 *
 * (SKILL.md §B2)
 */
export const idbPersister = createAsyncStoragePersister({
  storage: {
    getItem: (key: string) => get(key),
    setItem: (key: string, value: unknown) => set(key, value),
    removeItem: (key: string) => del(key),
  },
  key: 'docagen-query-cache',
  // Serializar apenas uma vez por segundo (throttle)
  // Evita escrever no IndexedDB a cada invalidação
  throttleTime: 1000,
});

/**
 * Global TanStack Query client configuration.
 * Configurado para offline-first conforme ADR-016 e MODULE-offline.md §B2.
 *
 * Regras (SKILL.md):
 * - gcTime ≥ staleTime sempre
 * - networkMode: 'offlineFirst' em queries e mutations críticas
 * - Não retry em erros de rede — utilizador provavelmente offline
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5min — não refetch desnecessário em utilizações normais
      staleTime: 1000 * 60 * 5,

      // 24h antes de GC — dados disponíveis offline durante o dia inteiro
      // (Preparado para PersistQueryClientProvider)
      gcTime: 1000 * 60 * 60 * 24,

      // CRÍTICO: serve do cache local sem esperar pela rede
      networkMode: 'offlineFirst',

      retry: (failureCount, error: unknown) => {
        const err = error as { response?: { status: number }; code?: string };
        // Não retry em erros de autenticação / cliente
        if (err?.response?.status === 401) return false;
        if (err?.response?.status === 403) return false;
        if (err?.response?.status === 404) return false;
        // Não retry em erro de rede — provavelmente offline
        if (err?.code === 'ERR_NETWORK') return false;
        return failureCount < 2;
      },

      // Não refetch ao focar a janela — evita requests desnecessários em Angola
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Mutations pausam offline e retomam quando online (usado no Sprint C)
      networkMode: 'offlineFirst',
      retry: false,
    },
  },
});


