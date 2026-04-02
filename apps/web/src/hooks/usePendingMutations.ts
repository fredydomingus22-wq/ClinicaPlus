import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * usePendingMutations - Hook para contar quantas mutações estão em estado 'pending' e 'paused'.
 * Útil para informar o utilizador sobre dados que aguardam sincronização.
 */
export function usePendingMutations(): number {
  const qc = useQueryClient();
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Função para calcular o total de mutações pausadas
    const updateCount = () => {
      const paused = qc.getMutationCache()
        .getAll()
        .filter(m => m.state.status === 'pending' && m.state.isPaused);
      setCount(paused.length);
    };

    // Calcular valor inicial
    updateCount();

    // Subscrever a alterações no cache de mutações
    const unsubscribe = qc.getMutationCache().subscribe(() => {
      updateCount();
    });

    return unsubscribe;
  }, [qc]);

  return count;
}
