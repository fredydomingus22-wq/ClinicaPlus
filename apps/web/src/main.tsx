import React from 'react';
import ReactDOM from 'react-dom/client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { App } from './App';
import { queryClient, idbPersister } from './lib/queryClient';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: idbPersister,
        buster: 'v2',
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
