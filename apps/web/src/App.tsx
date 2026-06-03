import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { toast as hotToast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { refreshSession } from './api/client';
import { useAuthStore } from './stores/auth.store';
import { useSocket } from './hooks/useSocket';
import { router } from './router';
import { ConnectivityBadge } from './components/ConnectivityBadge';
import { PendingSyncBadge } from './components/PendingSyncBadge';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { MutationManager } from './components/offline/MutationManager';
import { ConflictResolverModal } from './components/offline/ConflictResolverModal';
import { useSyncNotifications } from './hooks/useSyncNotifications';

/**
 * Loading component for session restoration.
 */
function FullPageSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>
  );
}

/**
 * Main App component.
 * Handles initial session restoration from the refresh cookie.
 */
export function App() {
  const { isRestoring, setRestoring } = useAuthStore();
  const socket = useSocket();
  const queryClient = useQueryClient();
  
  // PWA Sync Notifications (Sprint D)
  useSyncNotifications();

  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {
        queryClient.invalidateQueries();
      });
      return () => {
        socket.off('connect');
      };
    }
    return undefined;
  }, [socket, queryClient]);

  useEffect(() => {
    // Attempt to restore session on mount
    refreshSession()
      .catch(() => {
        // No active session or refresh failed, user needs to login
      })
      .finally(() => {
        setRestoring(false);
      });
  }, [setRestoring]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ kind: 'success' | 'error' | 'info'; message: string }>;
      const payload = custom.detail;
      if (!payload?.message) return;
      if (payload.kind === 'success') hotToast.success(payload.message);
      else if (payload.kind === 'error') hotToast.error(payload.message);
      else hotToast(payload.message);
    };
    window.addEventListener('clinicaplus:toast', handler as EventListener);
    return () => window.removeEventListener('clinicaplus:toast', handler as EventListener);
  }, []);

  if (isRestoring) {
    return <FullPageSpinner />;
  }

  return (
    <>
      {/* Skip links for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded focus:outline-none"
      >
        Pular para conteúdo principal
      </a>

      {/* Live region for screen readers to announce dynamic notifications */}
      <div aria-live="polite" aria-atomic="true">
        <Toaster position="top-right" reverseOrder={false} />
      </div>

      <ConnectivityBadge />
      <PendingSyncBadge />
      <MutationManager />
      <ConflictResolverModal />
      <div id="main-content">
        <RouterProvider router={router} />
      </div>
      <PwaUpdatePrompt />
    </>
  );
}

