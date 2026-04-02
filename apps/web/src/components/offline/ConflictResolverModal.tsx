import React from 'react';
import { Modal, Button } from '@clinicaplus/ui';
import { useOfflineStore } from '../../stores/useOfflineStore';
import { AlertTriangle, Trash2 } from 'lucide-react';

export function ConflictResolverModal() {
  const { conflicts, resolveConflict } = useOfflineStore();
  
  // Always show the first conflict if any
  const currentConflict = conflicts[0];

  if (!currentConflict) return null;

  const handleDiscard = () => {
    currentConflict.mutation.destroy();
    resolveConflict(currentConflict.mutationId);
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => {}} // Force resolution
      title="Conflito de Sincronização"
      size="md"
    >
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-900">Alteração Conflitante</p>
            <p className="text-xs text-amber-800 leading-relaxed">
              Tentou alterar um registo que foi modificado noutro dispositivo ou cujo horário já não está disponível.
            </p>
          </div>
        </div>

        <div className="p-3 border border-[#e5e5e5] rounded-lg bg-[#fcfcfc]">
          <p className="text-[10px] text-[#737373] uppercase font-bold mb-1">Operação</p>
          <p className="text-sm font-medium text-[#1a1a1a]">Actualização de Estado</p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button 
            variant="ghost" 
            className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleDiscard}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Descartar alteração local
          </Button>
          <p className="text-[10px] text-[#A3A3A3] text-center">
            Ao descartar, a aplicação irá carregar o estado mais recente do servidor.
          </p>
        </div>
      </div>
    </Modal>
  );
}
