import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * usePendingMutations - Hook para contar quantas mutações estão em estado 'pending' e 'paused'.
 * Útil para informar o utilizador sobre dados que aguardam sincronização.
 */
export function usePendingMutations(): number {
  const qc = useQueryClient();
  
  // Função que extrai o valor atual do cache de forma pura
  const getPausedCount = () => 
    qc.getMutationCache()
      .getAll()
      .filter(m => m.state.status === 'pending' && m.state.isPaused)
      .length;

  // Estado inicializado com o valor atual para evitar saltos visuais,
  // mas o React pode reclamar se mudarmos isso no render. 
  // Iniciamos com o valor real e confiamos no useEffect para sincronizar.
  const [count, setCount] = useState(getPausedCount);

  useEffect(() => {
    // Sincronizar o estado caso o cache tenha mudado entre o render e o mount
    setCount(getPausedCount());

    // Subscrever a alterações no cache de mutações
    const unsubscribe = qc.getMutationCache().subscribe(() => {
      setCount(getPausedCount());
    });

    return unsubscribe;
  }, [qc]);

  return count;
}
