import React from 'react';
import ReactDOM from 'react-dom/client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { App } from './App';
import { queryClient, idbPersister } from './lib/queryClient';
import './index.css';

// Tratar erros de carregamento dinâmico de chunks (ex: após novo deploy no Vercel)
window.addEventListener('vite:preloadError', () => {
  const lastReload = window.sessionStorage.getItem('last-chunk-reload');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    window.sessionStorage.setItem('last-chunk-reload', String(now));
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: idbPersister,
        buster: 'v5',
      }}
      onSuccess={() => {
        // Retomar mutações que foram pausadas enquanto offline e invalidar queries.
        // Assim garantimos que o estado está fresco após restauro do cache. (Sprint B/C)
        queryClient.resumePausedMutations().then(() => {
          queryClient.invalidateQueries();
        });
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>
);
