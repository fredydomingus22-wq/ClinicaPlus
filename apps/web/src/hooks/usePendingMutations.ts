import { useSyncExternalStore, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * usePendingMutations - Hook para contar quantas mutações estão em estado 'pending' e 'paused'.
 * Útil para informar o utilizador sobre dados que aguardam sincronização.
 */
export function usePendingMutations(): number {
  const qc = useQueryClient();
  
  const subscribe = useCallback((callback: () => void) => {
    return qc.getMutationCache().subscribe(callback);
  }, [qc]);

  const getSnapshot = useCallback(() => {
    return qc.getMutationCache()
      .getAll()
      .filter(m => m.state.status === 'pending' && m.state.isPaused)
      .length;
  }, [qc]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
