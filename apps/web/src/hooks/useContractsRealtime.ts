import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketEvent } from './useSocketEvent';

export function useContractsRealtime() {
  const qc = useQueryClient();

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['contracts'] });
    qc.invalidateQueries({ queryKey: ['contract-detail'] });
    qc.invalidateQueries({ queryKey: ['contract-events'] });
    qc.invalidateQueries({ queryKey: ['contract-faturas'] });
  }, [qc]);

  useSocketEvent('contract:created', invalidate);
  useSocketEvent('contract:status_changed', invalidate);
  useSocketEvent('contract:payment_registered', invalidate);
  useSocketEvent('contract:document_added', invalidate);
}

