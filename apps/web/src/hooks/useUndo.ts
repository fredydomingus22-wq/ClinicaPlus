import { useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface UndoOptions {
  message: string;
  undoAction: () => void | Promise<void>;
  undoLabel?: string;
}

/**
 * Hook para exibir toast com ação de undo
 * Nota: Para implementação completa, considerar biblioteca como react-hot-toast com custom render
 */
export function useUndo() {
  const showUndo = useCallback(({ message, undoAction, undoLabel = 'Desfazer' }: UndoOptions) => {
    toast.success(message, {
      duration: 5000,
    });

    // TODO: Implement undo action with custom render
    // Log para debugging - implementação completa requer custom render
    // console.log(`Undo action available: ${undoLabel}`);
  }, []);

  return { showUndo };
}
