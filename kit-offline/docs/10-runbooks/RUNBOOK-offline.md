# Runbook — Offline-First PWA (DocAgen)

## Diagnóstico rápido

| Sintoma | Causa | Secção |
|---------|-------|--------|
| App não carrega offline | SW não registado ou `navigateFallback` errado | 1 |
| Dados desaparecem offline | `gcTime` muito curto ou `networkMode` errado | 2 |
| Dados stale nunca actualizam | SW está a interceptar API (conflito com TanStack) | 3 |
| Update não aplicado após deploy | SW antigo ainda activo | 4 |
| Cache IndexedDB corrompido | Mudar `buster` ou limpar manualmente | 5 |
| Mutations offline não sincronizam | `resumePausedMutations` não chamado | 6 |
| Conflitos de dados (409) | Versão do servidor é diferente da local | 8 |

---

## 1. App não carrega offline

```bash
# Chrome DevTools → Application → Service Workers
# Verificar se SW está registado e "activated"

# Se SW não registado:
# 1. Verificar que vite.config.ts tem VitePWA configurado
# 2. Verificar que foi feito um BUILD (não dev) — SW não funciona em modo dev
pnpm build --filter=web && pnpm preview --filter=web

# Se SW registado mas app não carrega:
# Verificar navigateFallback no vite.config.ts
# navigateFallback: '/index.html'
# navigateFallbackDenylist: [/^\/api\//]  ← CRÍTICO

# Limpar SW e testar de novo:
# DevTools → Application → Service Workers → Unregister
# Reload → o SW é re-registado no próximo build
```

---

## 2. Dados desaparecem quando fica offline

```bash
# Verificar no código:
# gcTime deve ser >= 24h para dados do dia
# networkMode: 'offlineFirst' na query

# Verificar no browser:
# DevTools → Application → IndexedDB → docagen-query-cache
# Se vazio: os dados nunca foram persistidos

# Causas comuns:
# 1. PersistQueryClientProvider não está na raiz da árvore React
# 2. gcTime inferior ao staleTime (dados removidos antes de ficarem stale)
# 3. logout chama queryClient.clear() mas utilizador está offline e não fez novo login

# Verificar buster — se mudou e o utilizador não fez reload, cache é invalidado:
# Solução: incrementar buster só quando há breaking changes no schema de dados
```

---

## 3. Dados nunca actualizam (sempre stale)

```bash
# Causa mais comum: SW está a interceptar chamadas à API
# Verificar no vite.config.ts:
# navigateFallbackDenylist DEVE incluir /^\/api\//

# Verificar no DevTools → Network:
# Se chamadas à API mostram "(ServiceWorker)" → SW está a interceptar
# Solução: verificar que runtimeCaching NÃO tem padrões de /api/

# Verificar staleTime:
# Se staleTime muito alto (ex: 7 dias), TanStack Query não refetch
# mesmo com rede disponível
# Solução: reduzir staleTime (mas não gcTime)
```

---

## 4. Update de SW não aplicado após deploy

```bash
# Causa: SW antigo tem clientes activos
# A configuração skipWaiting: true e clientsClaim: true resolve na maioria dos casos

# Se ainda não actualiza:
# 1. Verificar que PwaUpdatePrompt está a funcionar
# 2. Forçar update no DevTools → Application → Service Workers → Update
# 3. Hard reload: Ctrl+Shift+R

# Em produção, o SW verifica updates de hora em hora (configurado com setInterval)
# Após novo deploy na Vercel, na próxima abertura a app mostrará o prompt de update
```

---

## 5. Cache corrompido ou incompatível

```bash
# Quando há breaking changes nos dados (nova propriedade, tipo diferente):
# 1. Incrementar buster no PersistQueryClientProvider
# Antes: buster: 'v1'
# Depois: buster: 'v2'
# → invalida todos os caches persistidos automaticamente no próximo load

# Se um utilizador específico tem problemas:
# DevTools → Application → IndexedDB → docagen-query-cache → right-click → Clear
# Ou via console:
indexedDB.deleteDatabase('docagen-query-cache')
# → na próxima abertura, dados são carregados da rede

# Em caso de emergência (bug de dados em produção):
# Incrementar buster → deploy → todos os utilizadores perdem cache
# → carregam dados frescos da rede
```

---

## 6. Mutations offline não sincronizam ao voltar online

```bash
# Verificar que onSuccess do PersistQueryClientProvider chama:
# queryClient.resumePausedMutations()
# Se não estiver, adicionar ao main.tsx

# Verificar no DevTools → Application → IndexedDB:
# As mutations pausadas devem estar guardadas em 'mutations'

# Verificar que networkMode: 'offlineFirst' está nas mutations que queremos pausar
# (NÃO em createAgendamento — esse deve falhar offline)

# Para ver mutations pendentes no console:
queryClient.getMutationCache().getAll()
  .filter(m => m.state.isPaused)
  .map(m => ({ id: m.mutationId, variables: m.state.variables }))
```

---

## 7. Testar offline em produção (Vercel)

```bash
# 1. Deploy normal para Vercel
# 2. Abrir app no Chrome mobile (ou desktop)
# 3. Carregar dados (fazer login, ver agendamentos)
# 4. DevTools → Network → Offline (ou desligar WiFi no telemóvel)
# 5. Reload → app deve carregar do SW
# 6. Dados de agendamentos devem estar visíveis do IndexedDB
# 7. Tentar criar agendamento → deve mostrar erro "Sem ligação"
# 8. Confirmar agendamento → deve actualizar UI imediatamente (optimistic)
# 9. Voltar online → mutation deve sincronizar automaticamente

---

## 8. Conflitos de dados (409) persistentes

```bash
# Sintoma: UI mostra toast de conflito e abre o Modal de Resolução.
# Causa: O servidor rejeitou a mudança (409) porque o registo foi alterado por outro.

# Acção recomendada:
# 1. Utilizador deve clicar em "Descartar Minhas Alterações".
# 2. A app limpa a mutação conflituosa e faz refetch do servidor.
# 3. Se o modal não fechar:
#    - Forçar limpeza via MutationManager (ícone de engrenagem no PendingSyncBadge).
#    - Clicar em "Limpar Tudo" para resetar a queue.

# Diagnóstico via código:
useOfflineStore.getState().conflicts // deve mostrar o erro 409 capturado
```

# Lighthouse PWA Audit (Chrome DevTools → Lighthouse → Progressive Web App):
# Todos os checks devem passar
# Score mínimo esperado: 100
```
