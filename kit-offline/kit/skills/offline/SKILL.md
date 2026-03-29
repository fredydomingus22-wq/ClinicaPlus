---
name: offline
description: >
  Usa esta skill SEMPRE que tocares em: vite.config.ts (secção VitePWA),
  src/lib/queryClient.ts, src/main.tsx (PersistQueryClientProvider),
  hooks com gcTime/staleTime/networkMode, useOnlineStatus, PwaUpdatePrompt,
  ConnectivityBadge, PendingSyncBadge, optimistic updates com onMutate/onError.
references:
  - reference/cache-strategies.md
  - reference/offline-patterns.md
  - reference/tdd-specs.md
related_skills:
  - tdd/SKILL.md
---

## Quando usar esta skill

- Modificar `vite.config.ts` para PWA
- Configurar `queryClient.ts` com persistência
- Implementar optimistic updates em mutations
- Criar componentes de conectividade (ConnectivityBadge, etc.)
- Adicionar prefetch após login

## Quando NÃO usar

- Modificar lógica de negócio não relacionada com offline
- Alterar rotas ou auth (sem impacto no offline)

---

## Regras absolutas

### 1. SW nunca intercepta chamadas à API
```typescript
// CORRECTO — SW só para assets estáticos e configurações globais
navigateFallbackDenylist: [/^\/api\//]
// TanStack Query persist trata da cache de dados da API

// ERRADO — causa conflito entre SW e TanStack Query revalidation
runtimeCaching: [{
  urlPattern: /\/api\/agendamentos/,  // ← NÃO fazer isto
  handler: 'StaleWhileRevalidate',
}]
```

### 2. networkMode: 'offlineFirst' nas queries críticas
```typescript
// CORRECTO — serve do cache local sem esperar pela rede
useQuery({
  queryKey: agendamentosKeys.hoje(),
  networkMode: 'offlineFirst',  // ← obrigatório
  gcTime: 1000 * 60 * 60 * 24, // ← 24h de persistência
})

// ERRADO — espera pela rede (default) → falha offline
useQuery({
  queryKey: agendamentosKeys.hoje(),
  // sem networkMode → default 'online' → sem dados offline
})
```

### 3. Criar agendamentos bloqueado sem rede
```typescript
// CORRECTO — verificar online antes de criar
onMutate: () => {
  if (!navigator.onLine) throw new OfflineError('...')
}

// ERRADO — criar offline → conflito de slot quando sincronizar
// networkMode: 'offlineFirst' em createAgendamento — NUNCA
```

### 4. gcTime ≥ staleTime sempre
```typescript
// CORRECTO
staleTime: 1000 * 60 * 5,   // 5min stale
gcTime:    1000 * 60 * 60 * 24, // 24h GC

// ERRADO — dados removidos do cache antes de ficarem stale
staleTime: 1000 * 60 * 60,  // 1h stale
gcTime:    1000 * 60 * 10,  // 10min GC ← remove antes do staleTime!
```

### 5. Logout limpa IndexedDB
```typescript
// CORRECTO — dados do utilizador anterior não persistem
async function logout() {
  await authApi.logout()
  queryClient.clear()           // limpa memória
  await del('clinicaplus-query-cache')  // limpa IndexedDB
  useAuthStore.getState().clearTokens()
  navigate('/login')
}
```

### 6. Incrementar buster ao mudar schema de dados
```tsx
// CORRECTO — invalida caches de utilizadores com versões anteriores
<PersistQueryClientProvider
  persistOptions={{
    buster: 'v2',  // ← incrementar quando estrutura de dados mudar
  }}
>
```

### 7. Optimistic updates com rollback sempre
```typescript
// CORRECTO — guardar estado anterior e fazer rollback em erro
onMutate: async (data) => {
  await queryClient.cancelQueries({ queryKey: key })
  const anterior = queryClient.getQueryData(key)
  queryClient.setQueryData(key, optimisticUpdate(data))
  return { anterior }  // ← sempre retornar
},
onError: (_, __, context) => {
  queryClient.setQueryData(key, context?.anterior)  // ← sempre fazer rollback
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: key })  // ← sempre invalidar
},
```

---

## Padrão de staleTime por tipo de dado

| Tipo de dado | staleTime | gcTime | Razão |
|-------------|-----------|--------|-------|
| Agendamentos hoje | 5min | 24h | Mudam frequentemente, precisamos hoje |
| Lista de pacientes | 10min | 24h | Mudam moderadamente |
| Médicos | 30min | 7 dias | Mudam raramente |
| Especialidades | 60min | 7 dias | Quase nunca mudam |
| Dashboard stats | 2min | 1h | Relativamente frequente |
| Config global | 60min | 24h | Muda raramente |
