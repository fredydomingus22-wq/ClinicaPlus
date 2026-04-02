import React from 'react';
import { useQueryClient, Mutation } from '@tanstack/react-query';
import { Modal } from '@clinicaplus/ui';
import { useOfflineStore } from '../../stores/useOfflineStore';
import { RefreshCw, Trash2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export function MutationManager() {
  const qc = useQueryClient();
  const { isMutationManagerOpen, setMutationManagerOpen, conflicts, resolveConflict } = useOfflineStore();
  
  // Get all paused mutations from the cache
  const pausedMutations = qc.getMutationCache().getAll().filter(m => m.state.isPaused);

  const getMutationLabel = (mutation: Mutation<unknown, unknown, unknown, unknown>) => {
    const key = mutation.options.mutationKey as string[] | undefined;
    if (!key) return 'Operação desconhecida';
    
    if (key.includes('agendamentos')) {
      if (key.includes('update-status')) return 'Actualizar estado de agendamento';
      return 'Alteração em agendamento';
    }
    if (key.includes('pacientes')) return 'Actualizar dados de paciente';
    
    return `Operação: ${key.join(' > ')}`;
  };

  const handleCancel = (mutation: Mutation<unknown, unknown, unknown, unknown>) => {
    mutation.destroy();
    qc.invalidateQueries(); // Refresh UI as optimistic values might need to revert manually or via refetch
  };

  return (
    <Modal
      isOpen={isMutationManagerOpen}
      onClose={() => setMutationManagerOpen(false)}
      title="Gestor de Sincronização"
      size="lg"
    >
      <div className="space-y-6">
        {/* Sync Queue */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" /> Fila de Espera ({pausedMutations.length})
            </h3>
            {pausedMutations.length > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">
                Aguardando Ligação
              </span>
            )}
          </div>

          {pausedMutations.length === 0 ? (
            <p className="text-sm text-[#737373] italic py-4 border border-dashed border-[#e5e5e5] rounded-lg text-center">
              Nenhuma alteração pendente de sincronização.
            </p>
          ) : (
            <div className="space-y-2">
              {pausedMutations.map((m) => (
                <div key={m.mutationId} className="flex items-center justify-between p-3 border border-[#e5e5e5] rounded-lg bg-[#fcfcfc] hover:bg-white transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-[#1a1a1a]">
                      {getMutationLabel(m as Mutation<unknown, unknown, unknown, unknown>)}
                    </span>
                    <span className="text-[10px] text-[#737373] uppercase font-mono">
                      ID: {String(m.mutationId).slice(0, 8)} • Criado em {format(m.state.submittedAt || Date.now(), 'HH:mm', { locale: pt })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCancel(m as Mutation<unknown, unknown, unknown, unknown>)}
                    className="p-2 text-[#737373] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Cancelar sincronização"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Conflicts Section */}
        {conflicts.length > 0 && (
          <section className="pt-4 border-t border-[#e5e5e5]">
            <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Conflitos Detectados ({conflicts.length})
            </h3>
            <div className="space-y-2">
              {conflicts.map((c) => (
                <div key={c.mutationId} className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-red-900">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {getMutationLabel(c.mutation as any)}
                    </span>
                    <span className="text-[10px] font-mono text-red-700 uppercase">Status: 409 Conflict</span>
                  </div>
                  <p className="text-xs text-red-800 mb-3">
                    Este registo foi alterado por outro utilizador ou o horário pretendido já não está disponível.
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => resolveConflict(c.mutationId)}
                      className="text-[10px] font-bold uppercase tracking-wider bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded hover:bg-red-100 transition-colors"
                    >
                      Descartar Alteração
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Info footer */}
        <div className="p-3 bg-[#f9f9f9] border border-[#e5e5e5] rounded-lg">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#1a1a1a]">Sincronização Automática</p>
              <p className="text-[11px] text-[#737373] leading-relaxed">
                As alterações na fila de espera serão enviadas automaticamente assim que a sua ligação à internet for restabelecida.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
