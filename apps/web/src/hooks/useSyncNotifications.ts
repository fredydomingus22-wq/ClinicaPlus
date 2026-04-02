import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

/**
 * Hook to trigger browser notifications when background synchronization completes.
 */
export function useSyncNotifications() {
  const qc = useQueryClient();
  const prevPendingCount = useRef(0);

  useEffect(() => {
    const unsubscribe = qc.getMutationCache().subscribe((event) => {
      // We only care about success or settled events that might change the pending count
      if (event.type !== 'updated' || !event.mutation) return;

      const allMutations = qc.getMutationCache().getAll();
      const pendingCount = allMutations.filter(
        (m) => m.state.status === 'pending' || m.state.isPaused
      ).length;

      // If we had pending mutations and now we have 0, sync completed
      if (prevPendingCount.current > 0 && pendingCount === 0 && navigator.onLine) {
        notifySyncSuccess();
      }

      prevPendingCount.current = pendingCount;
    });

    return unsubscribe;
  }, [qc]);
}

function notifySyncSuccess() {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification('DocAgen: Sincronização Concluída', {
      body: 'Todas as suas alterações foram gravadas no servidor com sucesso.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
    });
  } else if (Notification.permission !== 'denied') {
    // We don't force request here to avoid annoying the user immediately, 
    // but the task specified showing a system notification.
    // In a real app, we'd have a UI to toggle this.
    toast.success('Sincronização concluída!');
  }
}

/**
 * Helper to request notification permission
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}
