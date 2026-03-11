import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { authApi } from './api/auth';
import { useAuthStore } from './stores/auth.store';
import { queryClient } from './lib/queryClient';
import { router } from './router';

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
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" reverseOrder={false} />
    </QueryClientProvider>
  );
}
