# Reference: Estratégias de Cache

## Service Worker — por tipo de recurso

| Recurso | Estratégia | TTL | Razão |
|---------|-----------|-----|-------|
| HTML, JS, CSS, fontes | CacheFirst (precache) | Indefinido até novo deploy | Assets imutáveis após build |
| Imagens de assets | CacheFirst | 30 dias | Mudam raramente |
| Fontes externas (Google Fonts) | CacheFirst | 1 ano | Imutáveis por URL |
| Configurações globais (`/api/superadmin/sistema/...`) | StaleWhileRevalidate | 1h | Pouco frequente |
| Chamadas API de dados | ❌ Não cacheado no SW | — | TanStack Query trata disto |
| Auth endpoints | NetworkOnly | — | Nunca cacheados |
| Webhooks | NetworkOnly | — | Nunca cacheados |

## TanStack Query — por query

```typescript
// Tabela de referência
const CACHE_CONFIG = {
  agendamentosHoje:    { staleTime: 5*60*1000,  gcTime: 24*60*60*1000 },
  agendamentosLista:   { staleTime: 5*60*1000,  gcTime: 24*60*60*1000 },
  pacientesLista:      { staleTime: 10*60*1000, gcTime: 24*60*60*1000 },
  pacienteDetalhe:     { staleTime: 5*60*1000,  gcTime: 24*60*60*1000 },
  medicos:             { staleTime: 30*60*1000, gcTime: 7*24*60*60*1000 },
  especialidades:      { staleTime: 60*60*1000, gcTime: 7*24*60*60*1000 },
  dashboardStats:      { staleTime: 2*60*1000,  gcTime: 60*60*1000 },
  receitasPaciente:    { staleTime: 10*60*1000, gcTime: 24*60*60*1000 },
}
```

---

# Reference: Padrões Offline

## Padrão 1 — Read-only offline (aplicar a TODAS as queries)

```typescript
function useQueryOfflineFirst<T>(
  queryKey: QueryKey,
  queryFn: QueryFunction<T>,
  options?: UseQueryOptions<T>,
) {
  return useQuery({
    queryKey,
    queryFn,
    networkMode: 'offlineFirst',
    gcTime: 1000 * 60 * 60 * 24,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
    ...options,
  })
}
```

## Padrão 2 — Mutation que falha offline (criar agendamento)

```typescript
function useMutationOnlineOnly<TData, TVariables>(
  mutationFn: MutationFunction<TData, TVariables>,
  options?: UseMutationOptions<TData, Error, TVariables>,
) {
  return useMutation({
    mutationFn,
    onMutate: (variables) => {
      if (!navigator.onLine) {
        throw new OfflineError('Esta operação requer ligação à internet.')
      }
      return options?.onMutate?.(variables)
    },
    ...options,
  })
}
```

## Padrão 3 — Mutation optimistic com queue offline (confirmar/cancelar)

```typescript
function useMutationOptimistic<TData, TVariables, TContext>({
  mutationFn,
  queryKey,
  optimisticUpdate,
  onSuccess,
}: {
  mutationFn: MutationFunction<TData, TVariables>
  queryKey: QueryKey
  optimisticUpdate: (old: TContext, vars: TVariables) => TContext
  onSuccess?: (data: TData) => void
}) {
  return useMutation({
    mutationFn,
    networkMode: 'offlineFirst',
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey })
      const anterior = queryClient.getQueryData<TContext>(queryKey)
      queryClient.setQueryData<TContext>(queryKey, old =>
        old ? optimisticUpdate(old, variables) : old
      )
      return { anterior }
    },
    onError: (_, __, context: any) => {
      if (context?.anterior !== undefined) {
        queryClient.setQueryData(queryKey, context.anterior)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
    onSuccess,
  })
}
```

## Padrão 4 — Prefetch no login

```typescript
// Chamar imediatamente após login bem-sucedido, antes de redirecionar
async function prefetchCritico(clinicaId: string) {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: agendamentosKeys.hoje(),
      queryFn:  () => agendamentosApi.hoje(),
      staleTime: 1000 * 60 * 5,
    }),
    queryClient.prefetchQuery({
      queryKey: ['medicos', clinicaId],
      queryFn:  () => medicosApi.list(clinicaId),
      staleTime: 1000 * 60 * 30,
    }),
    queryClient.prefetchQuery({
      queryKey: ['especialidades', clinicaId],
      queryFn:  () => medicosApi.especialidades(clinicaId),
      staleTime: 1000 * 60 * 60,
    }),
  ])
}
```

---

# Reference: TDD Specs — offline

```typescript
// tests/offline.test.ts

describe('Sprint A — PWA Shell', () => {
  test('SW registado após primeiro load', async () => {
    // Usar @vite-pwa/test-utils ou verificar em Lighthouse
    const registrations = await navigator.serviceWorker.getRegistrations()
    expect(registrations.length).toBeGreaterThan(0)
  })

  test('app carrega com SW quando offline', async () => {
    // Simular offline
    await page.setOfflineMode(true)
    await page.reload()
    // App shell deve carregar
    await expect(page.locator('[data-testid="app-root"]')).toBeVisible()
  })

  test('ConnectivityBadge aparece quando offline', async () => {
    await page.setOfflineMode(true)
    await expect(page.locator('[data-testid="connectivity-badge"]')).toBeVisible()
  })

  test('ConnectivityBadge não aparece quando online', async () => {
    await page.setOfflineMode(false)
    await expect(page.locator('[data-testid="connectivity-badge"]')).not.toBeVisible()
  })
})

describe('Sprint B — Dados offline', () => {
  test('agendamentos visíveis após perder ligação', async () => {
    // Carregar com ligação
    await page.goto('/admin/agendamentos')
    await page.waitForSelector('[data-testid="agendamento-card"]')
    // Perder ligação
    await page.setOfflineMode(true)
    await page.reload()
    // Dados ainda visíveis do IndexedDB
    await expect(page.locator('[data-testid="agendamento-card"]').first()).toBeVisible()
  })

  test('skeleton aparece na primeira carga sem cache', async () => {
    // Limpar IndexedDB
    await page.evaluate(() => indexedDB.deleteDatabase('clinicaplus-query-cache'))
    await page.reload()
    await expect(page.locator('[data-testid="skeleton"]')).toBeVisible()
  })

  test('spinner de actualização em background após restore de cache', async () => {
    // Restaurar de IndexedDB + ligação disponível
    await expect(page.locator('[data-testid="fetching-indicator"]')).toBeVisible()
    // Desaparece quando fetch completa
    await expect(page.locator('[data-testid="fetching-indicator"]')).not.toBeVisible({ timeout: 5000 })
  })
})

describe('Sprint C — Writes resilientes', () => {
  test('criar agendamento offline → erro claro', async () => {
    await page.setOfflineMode(true)
    await page.click('[data-testid="btn-novo-agendamento"]')
    await page.fill('[data-testid="campo-paciente"]', 'João Silva')
    await page.click('[data-testid="btn-confirmar-agendamento"]')
    await expect(page.locator('[data-testid="toast-offline-error"]')).toBeVisible()
  })

  test('confirmar agendamento offline → optimistic update imediato', async () => {
    await page.setOfflineMode(true)
    const card = page.locator('[data-testid="agendamento-card"]').first()
    await card.locator('[data-testid="btn-confirmar"]').click()
    // Badge deve actualizar imediatamente (optimistic)
    await expect(card.locator('[data-testid="estado-badge"]')).toHaveText('Confirmado')
  })

  test('retomar mutation ao voltar online', async () => {
    await page.setOfflineMode(true)
    await page.click('[data-testid="btn-confirmar"]')
    await expect(page.locator('[data-testid="pending-sync-badge"]')).toBeVisible()
    await page.setOfflineMode(false)
    // Mutation enviada automaticamente
    await expect(page.locator('[data-testid="pending-sync-badge"]')).not.toBeVisible({ timeout: 5000 })
  })

  test('conflito de slot → rollback + toast', async () => {
    // Simular dois utilizadores com o mesmo slot
    await expect(page.locator('[data-testid="toast-slot-taken"]')).toBeVisible()
    // Estado deve ter revertido
    const card = page.locator('[data-testid="agendamento-card"]').first()
    await expect(card.locator('[data-testid="estado-badge"]')).not.toHaveText('Confirmado')
  })
})
```
