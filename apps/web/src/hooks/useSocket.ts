import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';
import { toast } from 'react-hot-toast';

// Singleton instance outside the component to survive re-renders
let instance: Socket | null = null;

/**
 * Hook to manage and provide a Socket.io client instance.
 * Connects automatically when an access token is available.
 */
export function useSocket(): Socket | null {
  const accessToken = useAuthStore(s => s.accessToken);
  const ref = useRef<Socket | null>(instance);

  useEffect(() => {
    // If we have no token, or if we already have an instance, don't create a new one.
    if (!accessToken) {
      if (instance) {
        instance.disconnect();
        instance = null;
        ref.current = null;
      }
      return;
    }

    if (instance) {
      ref.current = instance;
      return;
    }

    // Initialize the socket connection
    // Strip /api from the URL to avoid namespace confusion (/ws is on the base server)
    const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api$/, '');
    
    instance = io(baseUrl, {
      path: '/ws',
      auth: { token: accessToken },
      transports: ['websocket', 'polling'], // Prefer websocket for stability
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    instance.on('connect', () => {
      // Socket connected - no logging needed in production
    });

    instance.on('connect_error', (err) => {
      // Socket connection error - handled via toast
      
      if (err.message === 'timeout') {
         toast.error('Ligação lenta detectada. A tentar restabelecer...');
      } else {
         toast.error('Erro de ligação ao servidor de tempo real.');
      }
    });

    instance.on('auth:expired', () => {
      // Socket auth expired - handled by disconnect
      instance?.disconnect();
      instance = null;
    });

    ref.current = instance;

    return () => {
      // We don't necessarily want to disconnect on unmount if it's a singleton
      // but the requirement says "Desconecta ao fazer logout".
      // Since instance is nullified when accessToken is missing, this handles logouts.
    };
  }, [accessToken]);

  return ref.current;
}
