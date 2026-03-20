import { useEffect } from 'react';
import { useSocket } from './useSocket';

/**
 * Hook to subscribe to a specific WebSocket event.
 * 
 * @param event The event name to listen for
 * @param handler The callback function to execute when the event is received
 */
export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
