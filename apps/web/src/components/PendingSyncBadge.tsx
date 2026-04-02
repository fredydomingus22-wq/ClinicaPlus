import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { usePendingMutations } from '../hooks/usePendingMutations';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useOfflineStore } from '../stores/useOfflineStore';

/**
 * PendingSyncBadge - Exibe um indicador flutuante quando há acções realizadas offline
 * ou conflitos que requerem atenção do utilizador.
 */
export function PendingSyncBadge() {
  const count = usePendingMutations();
  const isOnline = useOnlineStatus();
  const { conflicts, setMutationManagerOpen } = useOfflineStore();

  const hasConflicts = conflicts.length > 0;
  
  // Se não houver nada pendente nem conflitos, não mostramos nada.
  // Se estivermos online e não houver conflitos, também escondemos (a sincronização é automática).
  if ((count === 0 && !hasConflicts) || (isOnline && !hasConflicts)) return null;

  return (
    <button
      onClick={() => setMutationManagerOpen(true)}
      className={`fixed bottom-4 right-4 ${hasConflicts ? 'bg-red-600 text-white' : 'bg-amber-500 text-amber-950'}
                  text-xs font-semibold px-3 py-2 rounded-full shadow-lg
                  flex items-center gap-1.5 z-40 border ${hasConflicts ? 'border-red-700' : 'border-amber-600'} 
                  hover:scale-105 transition-transform active:scale-95
                  animate-in fade-in slide-in-from-bottom-2`}
    >
      {hasConflicts ? (
        <>
          <AlertCircle className="h-3 w-3" />
          {conflicts.length} {conflicts.length === 1 ? 'conflito de sincronização' : 'conflitos detectados'}
        </>
      ) : (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" />
          {count} {count === 1 ? 'alteração pendente' : 'alterações por sincronizar'}
        </>
      )}
    </button>
  );
}
