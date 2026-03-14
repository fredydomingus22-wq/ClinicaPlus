# ClinicaPlus v2 — Documentação de Evolução

**Base:** v1 em produção (Railway + Vercel + Supabase)
**Princípio:** Elevar o que existe. Nenhum endpoint muda. Nenhuma regra da v1 cai.

---

## Diagnóstico da v1 — O Que Limita o Crescimento

| Limitação | Impacto Real | Solução v2 |
|-----------|-------------|------------|
| `node-cron` in-process | Lembrete perde-se se o Railway reiniciar | Redis + BullMQ (Sprint 1) |
| Polling de 60s na HojePage | Recepcionista vê dados atrasados | WebSocket via Socket.io (Sprint 2) |
| Sem faturação | Clínica usa papel para cobranças | Módulo Financeiro (Sprint 3-4) |
| `Plano` no schema, sem enforcement | Todos usam como Pro sem pagar | Plan enforcement + Billing (Sprint 5) |
| Roles fixas, sem granularidade | Admin não pode delegar permissões | RBAC granular (Sprint 6) |
| Sem testes E2E | Deploy em cego | Playwright + k6 (Sprint 7) |

---

## O Que NÃO Muda

```
Stack:         Node 20 + Express 4 + Prisma 5 + React 18 + Vite 5
Hosting:       Railway + Vercel + Supabase
Auth:          JWT 15min + httpOnly refresh cookie 7d (ADR-005 intacto)
Multitenancy:  clinicaId obrigatório em todas as queries
Língua:        Português pt-AO em todo o output de utilizador
Dinheiro:      Integer Kwanza — zero floats
Datas:         UTC stored, Africa/Luanda displayed
Endpoints:     Todos os URLs e payloads da v1 inalterados
```

---

## Os 6 Sprints

```
Sprint 1   Infraestrutura      Redis (Upstash) + BullMQ + apps/worker/
Sprint 2   Real-Time           Socket.io + badge "Tempo real"
Sprint 3   Financeiro Core     Fatura + Pagamento + UI
Sprint 4   Financeiro Avançado Seguros + Relatórios + Export CSV
Sprint 5   Plataforma          Plan enforcement + API Keys + Webhooks
Sprint 6   RBAC + Qualidade    Permissões granulares + Playwright + k6
```

Cada sprint é deployável e independente. Um sprint não bloqueia o seguinte.

---

## Índice de Documentos

```
docs/
  README-v2.md                         este ficheiro
  CLAUDE-v2.md                         instruções actualizadas para o agente

  01-adr/
    ADR-006-async-infrastructure.md    Redis + BullMQ vs cron in-process
    ADR-007-realtime.md                Socket.io vs polling vs SSE
    ADR-008-financial-module.md        módulo próprio vs gateway externo
    ADR-009-platform.md                API keys + webhooks + plan enforcement
    ADR-010-rbac.md                    RBAC granular vs roles fixas

  02-architecture/
    SYSTEM_DESIGN_v2.md                infra v2 completa + fluxo de eventos

  03-backend/
    BACKEND_v2.md                      novos services + workers + WebSocket server

  04-frontend/
    FRONTEND_v2.md                     real-time hooks + módulo financeiro UI

  05-database/
    DATABASE_SCHEMA_v2.md              delta: só o que é adicionado

  06-security/
    SECURITY_v2.md                     API keys + RBAC + audit trail

  07-api/
    API_REFERENCE_v2.md                novos endpoints (financeiro + plataforma)

  08-testing/
    TESTING_v2.md                      Playwright E2E + k6 load tests

  09-deployment/
    DEPLOYMENT_v2.md                   Redis + Worker no Railway

  10-runbooks/
    RUNBOOK-redis-workers.md           filas BullMQ + diagnóstico
    RUNBOOK-financeiro.md              reconciliação + export contabilidade

  11-modules/
    MODULE-financeiro.md               spec completo do módulo financeiro
    MODULE-plataforma.md               spec API keys + webhooks + planos
    MODULE-rbac.md                     spec RBAC granular + audit log
```

---

## Migração v1 → v2 — Risco por Sprint

| Sprint | Downtime | Breaking change para clientes |
|--------|----------|-------------------------------|
| 1 — Infra | Zero | Nenhum |
| 2 — Real-time | Zero | Nenhum (WS é adicional) |
| 3 — Financeiro Core | Zero | Nenhum (novas tabelas) |
| 4 — Financeiro Avançado | Zero | Nenhum |
| 5 — Plataforma | ~2 min (migration) | Plan enforcement pode bloquear clínicas acima do limite → período de graça obrigatório |
| 6 — RBAC + Qualidade | ~3 min (migration + seed) | Nenhum (permissões herdam roles existentes) |
