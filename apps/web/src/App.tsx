import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from './api/auth';
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
  const { isRestoring, setSession, setRestoring } = useAuthStore();
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
    authApi.refresh()
      .then((data) => {
        setSession(data.accessToken, data.utilizador);
      })
      .catch(() => {
        // No active session or refresh failed, user needs to login
      })
      .finally(() => {
        setRestoring(false);
      });
  }, [setSession, setRestoring]);

  if (isRestoring) {
    return <FullPageSpinner />;
  }

  return (
    <>
      <ConnectivityBadge />
      <PendingSyncBadge />
      <MutationManager />
      <ConflictResolverModal />
      <RouterProvider router={router} />
      <PwaUpdatePrompt />
      <Toaster position="top-right" reverseOrder={false} />
    </>
  );
}

