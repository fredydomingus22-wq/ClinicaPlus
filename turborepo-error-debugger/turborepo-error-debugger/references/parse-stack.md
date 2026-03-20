# Como parsear um Stack Trace

## Objetivo
Extrair de um stack trace: **arquivo de origem**, **linha/coluna**, **pacote do monorepo**, e **contexto da chamada**.

## Anatomia de um stack trace típico

```
TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (apps/web/src/components/UserList.tsx:24:18)       ← SEU CÓDIGO (ponto de entrada)
    at renderWithHooks (node_modules/react-dom/cjs/...)             ← ignorar
    at mountIndeterminateComponent (node_modules/react-dom/cjs/...) ← ignorar
    at beginWork (node_modules/react-dom/cjs/...)                   ← ignorar
```

**Regra:** O primeiro frame que aponta para fora de `node_modules` é o ponto de entrada do bug.

---

## Passo a passo de leitura

### 1. Identifique a mensagem de erro
```
TypeError: Cannot read properties of undefined (reading 'map')
```
→ Alguém chamou `.map()` em algo que é `undefined`.

### 2. Encontre o primeiro frame do seu código
Ignore tudo que começa com `node_modules/`. O primeiro frame fora de node_modules é onde investigar:
```
at UserList (apps/web/src/components/UserList.tsx:24:18)
         ^                              ^            ^  ^
         função                         arquivo     linha coluna
```

### 3. Identifique o pacote no monorepo
O caminho `apps/web/src/...` diz que o erro está no app `apps/web`.
Se fosse `packages/ui/src/...`, estaria num pacote compartilhado.

### 4. Classifique o contexto
- **Component render**: erro dentro de um componente React (arquivo `.tsx` com nome em PascalCase)
- **Hook**: arquivo começa com `use` (ex: `useUsers.ts`)
- **Util/service**: pasta `utils/`, `services/`, `lib/`
- **API call**: pasta `api/`, arquivo com `fetch` ou `axios`

---

## Exemplos reais e o que significam

### Erro em hook de fetch
```
Error: 400 Bad Request
    at throwIfResNotOk (apps/web/src/lib/queryClient.ts:12:11)
    at apps/web/src/lib/queryClient.ts:22:5
    at async apps/web/src/hooks/useUsers.ts:18:20
```
→ O erro vem do `queryClient.ts` linha 12, acionado pelo hook `useUsers.ts`.
→ Categoria: `HTTP_400` — investigar o payload sendo enviado no `useUsers.ts`.

### Erro de import não resolvido (build)
```
✗ [ERROR] Could not resolve "@repo/ui/Button"

    apps/web/src/pages/Home.tsx:3:7:
      3 │ import { Button } from '@repo/ui/Button'
```
→ Categoria: `CROSS_PACKAGE` — verificar `exports` em `packages/ui/package.json`
  e `resolve.alias` no `vite.config.ts` do `apps/web`.

### Erro de TypeScript em tempo de build
```
apps/web/src/components/Form.tsx(45,12): error TS2345:
  Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
```
→ Categoria: `RUNTIME_JS` (potencial) — valor pode ser undefined em runtime.
→ Fix: adicionar guard `if (!value) return` ou usar operador `??`.

### Erro de Turborepo pipeline
```
 ERROR  run failed: command  exited (1)
   apps/web:build: 
   apps/web:build: > web@0.0.1 build
   apps/web:build: > tsc && vite build
   apps/web:build: 
   apps/web:build: error TS2307: Cannot find module '@repo/ui'
```
→ Categoria: `TURBO_PIPELINE` + `CROSS_PACKAGE`
→ O `packages/ui` não rodou `build` antes do `apps/web:build`.
→ Fix: adicionar `"dependsOn": ["^build"]` no `turbo.json`.

---

## Checklist ao receber um stack trace

- [ ] Qual é a mensagem de erro (primeira linha)?
- [ ] Qual é o primeiro arquivo do projeto (não de `node_modules`)?
- [ ] Qual é o `app/` ou `package/` afetado?
- [ ] O erro ocorre em dev (`turbo run dev`) ou só no build (`turbo run build`)?
- [ ] O erro é consistente ou acontece apenas com certos dados?
