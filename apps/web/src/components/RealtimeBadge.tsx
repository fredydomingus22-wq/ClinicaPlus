import { useSocket } from '../hooks/useSocket';
import { useSyncExternalStore } from 'react';

/**
 * Component that displays a small badge indicating the real-time connection status.
 */
export function RealtimeBadge() {
  const socket = useSocket();

  // useSyncExternalStore to reactively track the 'connected' property of the socket
  const connected = useSyncExternalStore(
    (callback) => {
      if (!socket) return () => {};
      
      socket.on('connect', callback);
      socket.on('disconnect', callback);

      return () => {
        socket.off('connect', callback);
        socket.off('disconnect', callback);
      };
    },
    // Snapshot function: what is the current value?
    () => socket?.connected ?? false,
    // Server snapshot (SSG/SSR): defaults to false
    () => false
  );

  return (
    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
      <span 
        className={`h-1.5 w-1.5 rounded-full transition-colors ${
          connected ? 'bg-success-500' : 'bg-neutral-300'
        }`} 
      />
      {connected ? 'Tempo real' : 'A reconectar...'}
    </div>
  );
}
