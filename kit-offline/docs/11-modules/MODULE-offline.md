# MODULE — Offline-First PWA (Sprints A, B, C, D)

**ADR:** ADR-016
**Stack:** vite-plugin-pwa@1.x · Workbox 7.3 · @tanstack/react-query-persist-client · idb-keyval

---

## Sprint A — App Shell Instantânea (1-2 dias)

### A1. Instalar dependências

```bash
pnpm add -D vite-plugin-pwa --filter=web
pnpm add -D @vite-pwa/assets-generator --filter=web
```

### A2. vite.config.ts — configuração completa

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // autoUpdate: SW actualiza em background, sem prompt ao utilizador
      // Quando há update, aplica-se na próxima abertura da tab
      registerType: 'autoUpdate',

      // Incluir o SW no bundle de produção
      injectRegister: 'auto',

      // Gerar service worker automaticamente com Workbox
      strategies: 'generateSW',

      workbox: {
        // Precache todos os assets estáticos do build
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],

        // Não cometer erro comum: excluir ficheiros grandes (>2MB) do precache
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,

        // Limpar caches de versões anteriores automaticamente
        cleanupOutdatedCaches: true,

        // Controlar clientes imediatamente ao activar
        clientsClaim: true,
        skipWaiting: true,

        // CRÍTICO: definir navegação para SPA
        // Qualquer rota que não seja um asset → servir index.html do cache
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,           // nunca interceptar chamadas API
          /^\/webhook\//,       // nunca interceptar webhooks
          /\.[a-z]+$/,          // não interceptar ficheiros com extensão
        ],

        runtimeCaching: [
          // ── Assets de fontes externas (Google Fonts, etc.) ──────────────
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 ano
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── IMPORTANTE: NÃO cacheamos chamadas à API aqui ───────────────
          // O TanStack Query persist (Sprint B) trata da persistência de dados
          // Misturar SW cache com TanStack Query causa conflitos de revalidação
          //
          // Excepção: dados verdadeiramente estáticos (especialidades, provincias)
          {
            urlPattern: /\/api\/superadmin\/sistema\/configuracoes-globais/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'config-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 }, // 1h
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },

      manifest: {
        name: 'DocAgen',
        short_name: 'DocAgen',
        description: 'Gestão de clínicas privadas em Angola (Offline-First)',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/admin/dashboard',
        scope: '/',
        lang: 'pt',
        icons: [
          {
            src: '/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable', // ícone adaptável para Android
          },
        ],
        // Shortcuts: atalhos no ícone da app (Android long-press)
        shortcuts: [
          {
            name: 'Hoje',
            short_name: 'Hoje',
            description: 'Ver agendamentos de hoje',
            url: '/admin/agendamentos/hoje',
            icons: [{ src: '/shortcut-hoje.png', sizes: '96x96' }],
          },
          {
            name: 'Nova Marcação',
            short_name: 'Marcar',
            description: 'Marcar nova consulta',
            url: '/admin/agendamentos/novo',
            icons: [{ src: '/shortcut-novo.png', sizes: '96x96' }],
          },
        ],
      },

      // Suporte a desenvolvimento (ver SW logs no browser)
      devOptions: {
        enabled: false, // activar só para debug: true
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
})
```

### A3. Gerar ícones PWA

```bash
# Gerar todos os ícones a partir de uma única imagem fonte (1024x1024 PNG)
# Colocar a imagem em: apps/web/public/logo-source.png
pnpm exec pwa-assets-generator --preset minimal public/logo-source.png
```

Gera automaticamente: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`.

### A4. Componente de actualização disponível

```tsx
// apps/web/src/components/PwaUpdatePrompt.tsx
// Mostra banner quando há nova versão do SW disponível

import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Verificar updates a cada 60 minutos
      r && setInterval(() => r.update(), 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80
                    bg-primary-600 text-white rounded-xl shadow-lg p-4 z-50
                    flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold">Nova versão disponível</p>
        <p className="text-xs text-primary-200 mt-0.5">
          Actualiza para ter as últimas melhorias
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-xs text-primary-200 hover:text-white px-2 py-1"
        >
          Mais tarde
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          className="text-xs bg-white text-primary-700 font-semibold
                     px-3 py-1 rounded-lg hover:bg-primary-50"
        >
          Actualizar
        </button>
      </div>
    </div>
  )
}
```

Adicionar ao `App.tsx`:
```tsx
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt'

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <PwaUpdatePrompt />
    </>
  )
}
```

### A5. Indicador de conectividade

```tsx
// apps/web/src/components/ConnectivityBadge.tsx
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export function ConnectivityBadge() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null // não mostrar quando online — não interromper o fluxo

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950
                    text-xs font-semibold text-center py-1.5 px-4
                    flex items-center justify-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-800 animate-pulse" />
      Sem ligação · Os dados podem não estar actualizados
    </div>
  )
}

// apps/web/src/hooks/useOnlineStatus.ts
import { useState, useEffect } from 'react'

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
```

Adicionar ao `RootLayout` ou `App.tsx`:
```tsx
import { ConnectivityBadge } from './components/ConnectivityBadge'
// <ConnectivityBadge /> antes do conteúdo principal
```

---

## Sprint B — Dados Offline com IndexedDB (3-4 dias)

### B1. Instalar dependências

```bash
pnpm add @tanstack/react-query-persist-client idb-keyval --filter=web
```

### B2. Configurar persister no queryClient

```typescript
// apps/web/src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { del, get, set } from 'idb-keyval'

// Persister baseado em IndexedDB
// Capacidade: 50-100MB+ (vs ~5MB do localStorage)
// Assíncrono: não bloqueia o main thread
export const idbPersister = createAsyncStoragePersister({
  storage: {
    getItem:    (key)        => get(key),
    setItem:    (key, value) => set(key, value),
    removeItem: (key)        => del(key),
  },
  // Serializar apenas uma vez por segundo (throttle)
  // Evita escrever no IndexedDB a cada invalidação
  throttleTime: 1000,
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 24h antes de fazer GC — dados disponíveis durante um dia inteiro
      gcTime: 1000 * 60 * 60 * 24,

      // 5min de stale time — não refetch desnecessário
      staleTime: 1000 * 60 * 5,

      // CRÍTICO: tentar cache local antes de ir à rede
      // Contrasta com o default 'online' que espera por rede
      networkMode: 'offlineFirst',

      // Em caso de erro de rede, não mostrar erro — mostrar dados stale
      retryOnMount: false,
      retry: (failureCount, error: any) => {
        // Não retry em erros de rede — provavelmente offline
        if (error?.code === 'ERR_NETWORK') return false
        return failureCount < 2
      },
    },
    mutations: {
      // Pausar mutations quando offline, retomar quando online
      networkMode: 'offlineFirst',
    },
  },
})
```

### B3. PersistQueryClientProvider na raiz

```tsx
// apps/web/src/main.tsx
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, idbPersister } from './lib/queryClient'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister:  idbPersister,
        // Manter dados até 24h
        maxAge:     1000 * 60 * 60 * 24,
        // Versão do cache — incrementar quando o schema de dados mudar
        // para invalidar caches antigos de utilizadores com versões anteriores
        buster:     'v2',
      }}
      onSuccess={() => {
        // Após restaurar cache do IndexedDB:
        // Retomar mutations que ficaram pendentes offline
        queryClient.resumePausedMutations().then(() => {
          // Invalidar para buscar dados frescos em background
          queryClient.invalidateQueries()
        })
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>
)
```

### B4. Queries críticas com staleTime longo

Actualizar as queries mais importantes para aproveitar a persistência:

```typescript
// apps/web/src/hooks/useAgendamentos.ts

export function useAgendamentosHoje() {
  return useQuery({
    queryKey: agendamentosKeys.hoje(),
    queryFn:  () => agendamentosApi.hoje(),
    // Dados de hoje ficam válidos 5min — refetch em background se online
    staleTime: 1000 * 60 * 5,
    // 24h no cache — disponível offline durante o dia inteiro
    gcTime:    1000 * 60 * 60 * 24,
    // placeholder: mostrar dados do cache IMEDIATAMENTE enquanto carrega dados frescos
    placeholderData: keepPreviousData,
  })
}

export function usePacientes(search?: string) {
  return useQuery({
    queryKey: pacientesKeys.list(search),
    queryFn:  () => pacientesApi.list(search),
    staleTime: 1000 * 60 * 10,  // 10min — lista de pacientes muda devagar
    gcTime:    1000 * 60 * 60 * 24,
    placeholderData: keepPreviousData,
  })
}

export function useMedicos() {
  return useQuery({
    queryKey: ['medicos'],
    queryFn:  medicos => medicosApi.list(),
    staleTime: 1000 * 60 * 30,  // 30min — médicos mudam raramente
    gcTime:    1000 * 60 * 60 * 24 * 7,  // 7 dias — dados muito estáveis
  })
}
```

### B5. Prefetch no login — carregar dados antes de precisar

```typescript
// apps/web/src/hooks/useAuth.ts

export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      // Guardar tokens
      useAuthStore.getState().setTokens(data)

      // Prefetch imediato após login — enquanto redireciona
      // Dados chegam antes da página estar visível
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: agendamentosKeys.hoje(),
          queryFn:  () => agendamentosApi.hoje(),
        }),
        queryClient.prefetchQuery({
          queryKey: ['medicos'],
          queryFn:  () => medicosApi.list(),
        }),
        queryClient.prefetchQuery({
          queryKey: ['especialidades'],
          queryFn:  () => medicosApi.especialidades(),
        }),
      ])

      navigate('/admin/dashboard')
    },
  })
}
```

### B6. Skeleton screens — percepção de velocidade

Mesmo com dados em cache, mostrar conteúdo enquanto refetch acontece em background:

```tsx
// apps/web/src/pages/admin/HojePage.tsx

export default function HojePage() {
  const { data, isLoading, isFetching } = useAgendamentosHoje()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Hoje</h1>
        {/* Spinner subtil durante refetch em background — não bloqueia o conteúdo */}
        {isFetching && !isLoading && (
          <span className="text-xs text-neutral-400 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            A actualizar...
          </span>
        )}
      </div>

      {isLoading
        // Primeira carga sem cache: skeletons
        ? <AgendamentosSkeletonList />
        // Cache disponível: mostrar imediatamente
        : <AgendamentosList agendamentos={data ?? []} />
      }
    </div>
  )
}

// Skeleton idêntico ao layout real para evitar layout shift
function AgendamentosSkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-20 bg-neutral-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}
```

---

## Sprint C — Writes Resilientes com Optimistic Updates (1 semana)

### C1. Regra fundamental — verificar conectividade antes de criar agendamentos

```typescript
// apps/web/src/hooks/useAgendamentos.ts

export function useCreateAgendamento() {
  const isOnline = useOnlineStatus()

  return useMutation({
    mutationFn: agendamentosApi.criar,

    // Bloquear criação sem rede — conflito de slot inaceitável
    onMutate: () => {
      if (!isOnline) {
        throw new OfflineError('Não é possível marcar consultas sem ligação à internet.')
      }
    },

    onSuccess: () => {
      // Invalidar para mostrar o novo agendamento
      queryClient.invalidateQueries({ queryKey: agendamentosKeys.hoje() })
      toast.success('Consulta marcada com sucesso!')
    },

    onError: (error) => {
      if (error instanceof OfflineError) {
        toast.error(error.message, {
          description: 'Liga-te à internet para marcar consultas.',
          duration: 5000,
        })
        return
      }
      if (error.code === 'SLOT_TAKEN') {
        toast.error('Este horário já está ocupado.', {
          description: 'Por favor escolhe outro horário.',
        })
        return
      }
      toast.error('Erro ao marcar consulta. Tenta novamente.')
    },
  })
}

class OfflineError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OfflineError'
  }
}
```

### C2. Optimistic updates para actualizações de estado

Cancelar/confirmar agendamentos: sem conflito de slot — podem ser feitos offline com sync posterior.

```typescript
// apps/web/src/hooks/useAgendamentos.ts

export function useAtualizarEstadoAgendamento() {
  return useMutation({
    // networkMode offlineFirst: pausa automaticamente offline, retoma quando online
    networkMode: 'offlineFirst',

    mutationFn: ({ id, estado }: { id: string; estado: EstadoAgendamento }) =>
      agendamentosApi.atualizarEstado(id, estado),

    // Optimistic update: aplicar mudança IMEDIATAMENTE na UI
    onMutate: async ({ id, estado }) => {
      // Cancelar queries em background para evitar sobrescrever optimistic update
      await queryClient.cancelQueries({ queryKey: agendamentosKeys.hoje() })

      // Guardar estado anterior para rollback
      const anterior = queryClient.getQueryData(agendamentosKeys.hoje())

      // Aplicar mudança imediatamente na UI
      queryClient.setQueryData(agendamentosKeys.hoje(), (old: Agendamento[]) =>
        old?.map(ag => ag.id === id ? { ...ag, estado } : ag) ?? []
      )

      return { anterior }
    },

    onError: (err, _, context) => {
      // Rollback: restaurar estado anterior
      if (context?.anterior) {
        queryClient.setQueryData(agendamentosKeys.hoje(), context.anterior)
      }
      toast.error('Erro ao actualizar estado. A reverter...')
    },

    onSettled: () => {
      // Buscar dados frescos do servidor após mutation
      queryClient.invalidateQueries({ queryKey: agendamentosKeys.hoje() })
    },
  })
}
```

### C3. Mutation queue persistida — sync automático ao voltar online

```typescript
// apps/web/src/lib/mutationCache.ts
// O TanStack Query persist inclui mutations pausadas automaticamente
// Quando a ligação regressa, resumePausedMutations() é chamado no onSuccess do Provider

// Para mostrar ao utilizador quantas mutations estão pendentes:
export function usePendingMutations() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const unsubscribe = queryClient.getMutationCache().subscribe(event => {
      const paused = queryClient.getMutationCache()
        .getAll()
        .filter(m => m.state.status === 'pending' && m.state.isPaused)
      setCount(paused.length)
    })
    return unsubscribe
  }, [])

  return count
}

// Componente indicador
function PendingSyncBadge() {
  const count    = usePendingMutations()
  const isOnline = useOnlineStatus()

  if (count === 0 || isOnline) return null

  return (
    <div className="fixed bottom-4 right-4 bg-amber-500 text-amber-950
                    text-xs font-semibold px-3 py-2 rounded-full shadow-lg
                    flex items-center gap-1.5 z-40">
      <RefreshCw className="h-3 w-3 animate-spin" />
      {count} {count === 1 ? 'alteração' : 'alterações'} por sincronizar
    </div>
  )
}
```

### C4. Feedback visual de estado de sincronização

```tsx
// Para mutations individuais — mostrar estado em cada card
function AgendamentoCard({ agendamento }: { agendamento: Agendamento }) {
  const { mutate, isPending, isPaused } = useAtualizarEstadoAgendamento()

  return (
    <div className={`rounded-xl border p-4 transition-opacity ${isPaused ? 'opacity-60' : ''}`}>
      {/* Indicador de sync pendente */}
      {isPaused && (
        <span className="text-xs text-amber-600 flex items-center gap-1 mb-2">
          <Clock className="h-3 w-3" />
          A aguardar ligação para sincronizar
        </span>
      )}

      {/* Conteúdo normal */}
      <p className="font-medium">{agendamento.pacienteNome}</p>
      {/* ... */}

      {/* Botão de confirmação */}
      <button
        onClick={() => mutate({ id: agendamento.id, estado: 'CONFIRMADO' })}
        disabled={isPending}
        className="..."
      >
        {isPending ? <Loader2 className="animate-spin" /> : 'Confirmar'}
      </button>
    </div>
  )
}
```

---

## Sprint D — Resolução de Conflitos e Feedback Final (3-4 dias)

### D1. Centralizar Estado de Conflitos (Zustand)

Gerir conflitos de forma centralizada permite que qualquer parte da UI responda a erros de sincronização em background.

```typescript
// apps/web/src/stores/useOfflineStore.ts
import { create } from 'zustand';

interface Conflict {
  mutation: any;
  error: any;
}

interface OfflineState {
  conflicts: Conflict[];
  addConflict: (mutation: any, error: any) => void;
  resolveConflict: (mutationId: string) => void;
  clearConflicts: () => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  conflicts: [],
  addConflict: (mutation, error) => 
    set((state) => ({ conflicts: [...state.conflicts, { mutation, error }] })),
  resolveConflict: (mutationId) =>
    set((state) => ({ 
      conflicts: state.conflicts.filter(c => c.mutation.meta?.id !== mutationId) 
    })),
  clearConflicts: () => set({ conflicts: [] }),
}));
```

### D2. Detecção de Conflito 409 (Optimistic Updates Revistos)

Actualizar os hooks para capturar o erro HTTP 409 (Conflict), que indica que o servidor tem dados mais recentes ou incompatíveis.

```typescript
// apps/web/src/hooks/useAgendamentos.ts
export function useUpdateEstadoAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    networkMode: 'offlineFirst',
    mutationFn: (vars) => agendamentosApi.updateEstado(vars.id, vars.estado),
    
    onError: (err: any, variables, context) => {
      // Rollback imediato
      if (context?.prevData) qc.setQueryData(['agendamentos', 'hoje'], context.prevData);

      // Se for conflito (409), enviar para o store de offline
      if (err.response?.status === 409) {
        useOfflineStore.getState().addConflict({ variables, meta: { id: variables.id } }, err);
        toast.error('Conflito detectado: este agendamento foi alterado por outro utilizador.');
      }
    },
    // ...
  });
}
```

### D3. Interface de Resolução de Conflitos

O utilizador deve ser notificado e ter uma opção clara de acção. A política padrão é **"Discard Local"** (assumir a verdade do servidor).

```tsx
// apps/web/src/components/offline/ConflictResolverModal.tsx
export function ConflictResolverModal() {
  const { conflicts, resolveConflict } = useOfflineStore();
  if (conflicts.length === 0) return null;

  return (
    <Modal title="Conflito de Dados">
      <p>Algumas alterações feitas offline entram em conflito com o servidor.</p>
      <button onClick={() => resolveConflict(conflicts[0].mutation.meta.id)}>
        Descartar Minhas Alterações (Usar Servidor)
      </button>
    </Modal>
  );
}
```

### D4. Notificações de Sincronização em Background

Utilizar a API de Notificações do browser para avisar o utilizador quando o sync termina enquanto ele navega noutras áreas.

```typescript
// apps/web/src/hooks/useSyncNotifications.ts
export function useSyncNotifications() {
  const qc = useQueryClient();
  const prevPending = useRef(0);

  useEffect(() => {
    return qc.getMutationCache().subscribe(() => {
      const pending = qc.getMutationCache().getAll().filter(m => m.state.status === 'pending').length;
      if (prevPending.current > 0 && pending === 0 && navigator.onLine) {
        new Notification('DocAgen: Sincronização Concluída');
      }
      prevPending.current = pending;
    });
  }, [qc]);
}
```

---

## checklist de Verificação Final

### Sprint A
- [x] PWA Lighthouse score > 90
- [x] Manifesto com branding DocAgen
- [x] ConnectivityBadge funcional

### Sprint B
- [x] Persistência em IndexedDB (storage > 50MB)
- [x] Buster de cache em 'v2'
- [x] OfflineFirst mode activo

### Sprint C
- [x] Optimistic Updates com rollback
- [x] PendingSyncBadge visível

### Sprint D
- [x] Detecção automática de erro 409
- [x] Modal de resolução de conflitos funcional
- [x] Notificações de sistema e toast ao concluir sync background
- [x] Gestor de Mutações (MutationManager) para limpeza de queue
