# Relatório de Onboarding + Auditoria (estado actual)

Data: 2026-05-24  
Projecto: **ClinicaPlus** — SaaS multi-tenant para gestão de clínicas privadas em Angola

## 1) Resumo executivo

O repositório está estruturado como **monorepo PNPM + Turborepo** (Node 20) com 3 aplicações principais (**API**, **Web**, **Worker**) e 4 packages partilhados (**types/ui/utils/events**).

O estado geral é “operacional”, com documentação v2 bem definida (Redis + BullMQ + Socket.io + módulos Financeiro/Plataforma/RBAC), mas existem **pendências críticas** que podem bloquear CI/CD e/ou causar inconsistências em produção:

1) **Drift / migração Prisma falhada** (produção fora do schema esperado)  
2) **Workflow “PR Check” com variáveis de ambiente insuficientes** (tende a falhar testes)  
3) **Uso simultâneo de `node-cron` em API e Worker** (risco de duplicação e timezone)  
4) **Integração fiscal (AGT) com inconsistências de credenciais e segredos em claro**

---

## 2) Onboarding: mapa rápido do sistema

### 2.1 Stack e tooling
- **Node.js 20**, TypeScript, **pnpm@9**, **turbo**
- **API**: Express 4, Prisma 5, PostgreSQL (Supabase), Redis (Upstash), BullMQ, Socket.io, Pino
- **Web**: React 18 + Vite, TanStack Query, Zustand, PWA (workbox/vite-plugin-pwa), Playwright E2E
- **Worker**: BullMQ consumers + jobs agendados

### 2.2 Estrutura do monorepo (alto nível)
- `apps/api` — backend REST + WebSocket (Socket.io)
- `apps/web` — frontend SPA
- `apps/worker` — tarefas assíncronas/filas + manutenção
- `packages/types` — Zod schemas/DTOs partilhados
- `packages/utils` — utilitários (inclui fiscal/AGT e testes fiscais)
- `packages/ui` — biblioteca de componentes
- `packages/events` — eventos/jobs partilhados (v2)
- `clinicaplus-docs-v6` — documentação v2 (arquitectura, ADRs, módulos, runbooks)

### 2.3 Fluxos principais (resumo)
- **Auth**: JWT + refresh cookie; existe também **API Keys** e integrações (WhatsApp, n8n, Typebot).
- **Multitenancy**: `clinicaId` obrigatório; middleware `tenantMiddleware` resolve `req.clinica` e bloqueia clínicas inactivas.
- **Assíncrono**: BullMQ (queues) para emails/lembretes/webhooks/reporting; Worker consome.
- **Observabilidade**:
  - `/health` com checks de DB + Redis (retorna 200 “ok” ou 207 “degraded”)
  - `/metrics` protegido por `x-metrics-token`
  - Alertas críticos via Resend (apenas em produção)

---

## 3) Auditoria: pendências críticas (priorizadas)

### CRÍTICO 1 — Drift / migração Prisma falhada em produção
**Sinais encontrados**
- Existe runbook dedicado: `apps/api/prisma/migrations/RUNBOOK-fix-failed-migration-20260521234500.md`
- O runbook indica explicitamente que o schema Prisma espera colunas que “nunca migraram” em produção, causando erros P3009/P3018.

**Impacto**
- Deploy/migrations podem falhar; endpoints fiscais podem quebrar por colunas/constraints ausentes; risco de downtime.

**Recomendação (próximos passos)**
1. Seguir o runbook para limpar o estado de `_prisma_migrations` e aplicar o SQL de colunas faltantes.
2. Garantir que a sequência de migrations está correcta (ex.: aplicar `20260521234000` antes de `20260521234500`).
3. Após correcção, correr `prisma migrate deploy` (ambiente com `DIRECT_URL` directo, não pooler transaccional).

---

### CRÍTICO 2 — Workflow “PR Check” tende a falhar testes
**Sinais encontrados**
- `apps/api/src/__tests__/helpers/setup.ts` lança erro se `DATABASE_URL` não estiver definido (“TEST: DATABASE_URL is not set…”).
- Workflow `.github/workflows/pr-check.yml` **não define** `DATABASE_URL`/`DIRECT_URL`/`FRONTEND_URL`/etc.
- `config.ts` valida `JWT_SECRET` e `JWT_REFRESH_SECRET` com `min(64)`; o PR Check usa valores “dummy” curtos.

**Impacto**
- PRs podem ficar “vermelhos” sem relação com alterações de código; contributors ficam bloqueados.

**Recomendação (próximos passos)**
Opções (escolher 1):
1) Ajustar o PR Check para usar secrets de um **DB de testes** (como o workflow `ci.yml` faz).  
2) Separar “unit tests puros” de “tests com DB” e usar um `setup.ts` diferente por suite.  
3) Introduzir modo `TEST` com prisma mock/SQLite (se aceitável) para unit tests.

---

### CRÍTICO 3 — `node-cron` em API e Worker (duplicação + timezone)
**Sinais encontrados**
- `apps/api/src/services/scheduler.service.ts` usa `node-cron` (ciclo de 5 minutos + tarefa mensal).
- `apps/worker/src/services/scheduler.service.ts` também usa `node-cron` (jobs diários/horários/30min).
- A documentação v2 descreve a migração de cron “in-process” para Redis + BullMQ.

**Impacto**
- Risco de execução dupla (ou em momentos errados por timezone), especialmente em ambientes com múltiplas réplicas.
- Se o container reiniciar, jobs in-process podem “perder” o ciclo.

**Recomendação (próximos passos)**
- Centralizar jobs periódicos no **Worker** usando BullMQ (repeatable jobs) e garantir idempotência por `jobId`.
- Manter a API stateless (ideal) ou desactivar o scheduler da API em produção se não for estritamente necessário.

---

### CRÍTICO 4 — Fiscal/AGT: credenciais e segredos (consistência e segurança)
**Sinais encontrados**
- O schema tem campos por clínica: `agtPrivateKey`, `agtPublicKey`.
- Credenciais AGT (Basic Auth) são **globais** e vêm de `process.env.AGT_USERNAME`/`AGT_PASSWORD`.
- Chaves privadas/certificados (AGT) parecem armazenadas em DB em claro (não passam por `encryptSecret()`).

**Impacto**
- Risco de multi-tenant errado (uma credencial global para várias clínicas).
- Risco de exposição de segredos caso DB/logs vazem.

**Recomendação (próximos passos)**
1) Decidir o modelo correcto:
   - **Credenciais AGT globais** (da plataforma) vs **credenciais por clínica**.
2) Implementar o modelo escolhido de forma consistente:
   - As credenciais são globais; encriptar apenas `agtPrivateKey/agtPublicKey` com AES-GCM (padrão já existe em `secretCrypto.ts`).
3) Validar/normalizar encoding (há sinais de BOM/UTF-8 mal interpretado em ficheiros fiscais e no schema).

---

## 4) Pendências importantes (não-críticas, mas recomendadas)

- **Higiene de repo**: existem artefactos e logs no repositório (ex.: `apps/web/playwright-report/`, `build-log*.txt`, `debug-error.json`, `apps/api/test-results.json`).  
  Recomenda-se mover para `.gitignore`/remover do tracking para reduzir ruído e risco de leak.

- **E2E specs com TODOs** no `apps/web/e2e/*` — podem não reflectir o fluxo actual do UI, gerando flakiness.

---

## 5) Plano sugerido de intervenção (ordem)

1) **Fechar migração falhada/drift** (produção/staging)  
2) **Arrumar CI (PR Check)** para ficar confiável  
3) **Consolidar schedulers** (tirar cron da API; BullMQ repeatable jobs no Worker)  
4) **Rever AGT/segredos** (modelo + encriptação + rotação)  
5) Limpeza de artefactos e TODOs restantes
