# Tasks: Sprints A + B + C — Offline-First PWA

---

# SPRINT A — App Shell Instantânea (1-2 dias)

## Leitura obrigatória

1. `docs/CLAUDE.md`
2. `docs/01-adr/ADR-016-offline-first-pwa.md`
3. `docs/11-modules/MODULE-offline.md` → secção Sprint A completa
4. `kit/skills/offline/SKILL.md`
5. `kit/skills/offline/reference/cache-strategies.md`

Confirma com: "Li os 5 ficheiros. A avançar para Sprint A."

## Contexto

O ClinicaPlus é um SPA React + Vite para clínicas em Angola. Angola tem 12.7 Mbps de média — abaixo da mediana global. Recepcionistas perdem sinal sem aviso. O objectivo é carregamento < 100ms após primeira visita e shell offline funcional.

Stack: React 19 · Vite (upgrade para v8 neste sprint) · TanStack Query v5 · Tailwind · pnpm monorepo

## Passo A1 — Upgrade Vite 8 (opcional mas recomendado)

```bash
pnpm add -D vite@latest --filter=web
pnpm build --filter=web  # verificar zero erros
```

Se `vite-plugin-pwa` der erro de compatibilidade:
```bash
pnpm add -D vite-plugin-pwa@latest --filter=web
```

## Passo A2 — Instalar dependências PWA

```bash
pnpm add -D vite-plugin-pwa@latest --filter=web
pnpm add -D @vite-pwa/assets-generator --filter=web
```

## Passo A3 — Configurar vite.config.ts

Implementar exactamente a configuração em `MODULE-offline.md` → secção A2.

Pontos críticos:
- `registerType: 'autoUpdate'` — sem prompt ao utilizador
- `navigateFallbackDenylist: [/^\/api\//]` — NUNCA interceptar a API
- `maximumFileSizeToCacheInBytes: 2 * 1024 * 1024` — sem warnings de ficheiros grandes
- NÃO adicionar runtimeCaching para `/api/` — TanStack Query trata disso
- Manifest com `start_url`, `shortcuts`, e ícones completos

## Passo A4 — Gerar ícones

```bash
# Colocar imagem fonte 1024x1024 PNG em apps/web/public/logo-source.png
# (usar o logo actual do ClinicaPlus ou um placeholder durante desenvolvimento)
cd apps/web
pnpm exec pwa-assets-generator --preset minimal public/logo-source.png
```

Confirmar que foram gerados: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`.

## Passo A5 — Componente PwaUpdatePrompt

Criar `apps/web/src/components/PwaUpdatePrompt.tsx`.
Ver código completo em `MODULE-offline.md` → secção A4.
Adicionar ao `App.tsx`.

## Passo A6 — Conectividade

Criar:
- `apps/web/src/hooks/useOnlineStatus.ts`
- `apps/web/src/components/ConnectivityBadge.tsx`

Ver código em `MODULE-offline.md` → secção A5.
Adicionar `<ConnectivityBadge />` ao layout raiz (antes do conteúdo principal).

## Passo A7 — Verificar build

```bash
pnpm build --filter=web

# Deve mostrar:
# ✓ service worker generated: dist/sw.js
# ✓ manifest generated: dist/manifest.webmanifest
# Sem warnings de maximumFileSizeToCacheInBytes

# Testar localmente com preview (simula produção)
pnpm preview --filter=web
# Abrir DevTools → Application → Service Workers → verificar SW registado
# DevTools → Lighthouse → PWA → deve mostrar score 100
```

## Checklist Sprint A

- [ ] `pnpm build --filter=web` sem warnings de cache
- [ ] SW registado em DevTools → Application → Service Workers
- [ ] Lighthouse PWA score: 100
- [ ] App funciona offline após primeiro load (DevTools → Network → Offline)
- [ ] `PwaUpdatePrompt` aparece quando há novo deploy (testar manualmente)
- [ ] `ConnectivityBadge` aparece/desaparece com offline/online
- [ ] Ícones aparecem correctamente (192px e 512px)
- [ ] "Add to Home Screen" disponível no Chrome mobile

---

# SPRINT B — Dados Offline com IndexedDB (3-4 dias)

## Leitura obrigatória (adicional ao Sprint A)

6. `docs/11-modules/MODULE-offline.md` → secção Sprint B
7. `kit/skills/offline/reference/cache-strategies.md` → padrões de staleTime

Confirma com: "Li os ficheiros do Sprint B. A avançar."

## Passo B1 — Instalar dependências

```bash
pnpm add @tanstack/react-query-persist-client idb-keyval --filter=web
```

## Passo B2 — Actualizar queryClient.ts

Localizar `apps/web/src/lib/queryClient.ts` (ou equivalente).

Substituir/actualizar com a configuração completa de `MODULE-offline.md` → secção B2:
- `gcTime: 1000 * 60 * 60 * 24` no defaultOptions
- `staleTime: 1000 * 60 * 5` no defaultOptions
- `networkMode: 'offlineFirst'` em queries e mutations
- Criar o `idbPersister` com `idb-keyval`

## Passo B3 — Actualizar main.tsx

Substituir `QueryClientProvider` por `PersistQueryClientProvider`.
Ver código completo em `MODULE-offline.md` → secção B3.

Implementar o `onSuccess` callback com `resumePausedMutations()` + `invalidateQueries()`.

## Passo B4 — Actualizar queries críticas

Localizar e actualizar estas queries com os valores correctos da tabela `CACHE_CONFIG`:

```typescript
// Actualizar gcTime e staleTime em:
// - useAgendamentosHoje()
// - useAgendamentos() (lista)
// - usePacientes()
// - useMedicos()
// - useEspecialidades()
// Adicionar: placeholderData: keepPreviousData
```

Ver valores exactos em `reference/cache-strategies.md` → tabela de staleTime.

## Passo B5 — Prefetch no login

Localizar `useLogin()` mutation no hook de autenticação.
Adicionar prefetch após `onSuccess`.
Ver código em `MODULE-offline.md` → secção B5.

Queries a prefetchar:
- `agendamentosKeys.hoje()`
- `['medicos', clinicaId]`
- `['especialidades', clinicaId]`

## Passo B6 — Skeleton screens

Para cada página com lista de dados, verificar:
1. `if (isLoading)` → mostrar skeleton (não spinner global)
2. `isFetching && !isLoading` → mostrar spinner subtil (não bloquear conteúdo)
3. `placeholderData: keepPreviousData` na query → sem flash de conteúdo vazio

Implementar `AgendamentosSkeletonList` (ver `MODULE-offline.md` → secção B6).

## Passo B7 — Limpar cache no logout

Localizar a função de logout e adicionar:
```typescript
queryClient.clear()
await del('clinicaplus-query-cache')  // del de idb-keyval
```

## Passo B8 — Verificar

```bash
# No browser:
# 1. Login → carregar agendamentos
# 2. DevTools → Network → Offline
# 3. Reload → dados ainda visíveis
# 4. DevTools → Application → IndexedDB → verificar dados guardados
# 5. Verificar que cache < 50MB
```

## Checklist Sprint B

- [ ] `isLoading` vs `isFetching` tratados correctamente em todas as listas
- [ ] Dados visíveis após reload offline
- [ ] IndexedDB tem dados após primeiro load online
- [ ] Login prefetcha dados antes de redirecionar
- [ ] Logout limpa IndexedDB
- [ ] `buster: 'v1'` definido no PersistQueryClientProvider
- [ ] Sem erros de TypeScript: `pnpm typecheck --filter=web`

---

# SPRINT C — Writes Resilientes (1 semana)

## Leitura obrigatória (adicional)

8. `docs/11-modules/MODULE-offline.md` → secção Sprint C completa
9. `kit/skills/offline/reference/cache-strategies.md` → padrões de mutations

Confirma com: "Li os ficheiros do Sprint C. A avançar."

## Passo C1 — OfflineError

Criar `apps/web/src/lib/errors.ts`:
```typescript
export class OfflineError extends Error {
  constructor(message = 'Esta operação requer ligação à internet.') {
    super(message)
    this.name = 'OfflineError'
  }
}
```

## Passo C2 — Mutation de criar agendamento (online-only)

Localizar `useCreateAgendamento()`.
Adicionar `onMutate` com verificação `navigator.onLine`.
Ver padrão completo em `MODULE-offline.md` → secção C1.

**Importante:** toast de erro deve ser claro: "Sem ligação — não é possível marcar agora."

## Passo C3 — Mutations de actualização de estado (offline-first)

Localizar `useAtualizarEstadoAgendamento()` (ou equivalente: confirmar, cancelar).
Implementar optimistic update completo com rollback.
Ver código em `MODULE-offline.md` → secção C2.

**Obrigatório:**
1. `networkMode: 'offlineFirst'`
2. `onMutate` com `cancelQueries` + snapshot anterior
3. `onError` com rollback do snapshot
4. `onSettled` com `invalidateQueries`

## Passo C4 — PendingSyncBadge

Criar `apps/web/src/components/PendingSyncBadge.tsx`.
Criar hook `usePendingMutations()`.
Ver código em `MODULE-offline.md` → secção C3.
Adicionar ao layout principal (próximo do ConnectivityBadge).

## Passo C5 — Feedback visual nos cards

Para `AgendamentoCard` (ou equivalente), adicionar:
- `opacity-60` quando `isPaused` (mutation pausada offline)
- Label "A aguardar ligação" quando `isPaused`
- Spinner no botão quando `isPending`

Ver código em `MODULE-offline.md` → secção C4.

## Passo C6 — Testar cenários de conflito

O backend já deve retornar `{ code: 'SLOT_TAKEN' }` em 409.
Verificar que o handler `onError` no mutation de criação trata este caso:
```typescript
if (error.code === 'SLOT_TAKEN') {
  toast.error('Este horário já foi ocupado.', {
    description: 'Por favor escolhe outro horário.',
  })
  return
}
```

## Checklist Sprint C

- [ ] Criar agendamento offline → toast claro de erro (não silencioso)
- [ ] Confirmar/cancelar offline → optimistic update imediato na UI
- [ ] Voltar online → mutations enviadas automaticamente
- [ ] Conflito de slot → rollback + toast específico
- [ ] `PendingSyncBadge` mostra contagem correcta
- [ ] Cards mostram estado "a aguardar ligação" quando pausados
- [ ] Logout cancela todas as mutations pendentes
- [ ] Testes de integração passam: `pnpm test --filter=web`

---

## Notas transversais aos 3 sprints

**Não misturar SW cache com TanStack Query para dados da API.** Esta é a fonte mais comum de bugs difíceis de diagnosticar — o SW serve dados stale enquanto o TanStack Query tenta revalidar. A regra é clara: SW apenas para assets estáticos.

**O `buster` no PersistQueryClientProvider.** Quando o schema de dados mudar (nova propriedade num agendamento, por exemplo), incrementar o `buster` de `'v1'` para `'v2'`. Isto invalida todos os caches persistidos de utilizadores com versões antigas da app — evita bugs de dados incompatíveis.

**Testar sempre em modo preview.** O SW não funciona em `vite dev` (salvo activar `devOptions.enabled: true`). Usar sempre `pnpm build && pnpm preview --filter=web` para testar comportamento offline real.
