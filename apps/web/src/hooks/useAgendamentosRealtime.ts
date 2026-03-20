import { useQueryClient } from '@tanstack/react-query';
import { useSocketEvent } from './useSocketEvent';
import { agendamentosKeys } from './useAgendamentos';

/**
 * Hook to listen for real-time appointment events and invalidate relevant queries.
 */
export function useAgendamentosRealtime() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: agendamentosKeys.hoje() });
    qc.invalidateQueries({ queryKey: agendamentosKeys.lists() });
  };

  useSocketEvent('agendamento:criado',  invalidate);
  useSocketEvent('agendamento:estado',  invalidate);
  useSocketEvent('agendamento:triagem', invalidate);
}
