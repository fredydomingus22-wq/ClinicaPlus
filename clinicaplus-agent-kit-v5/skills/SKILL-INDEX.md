# SKILL-INDEX — ClinicaPlus Agent Kit

> Lê este ficheiro antes de qualquer tarefa.
> Escolhe a skill certa → lê o SKILL.md dela → lê as references necessárias → implementa.

---

## Mapa de skills

| Skill | Localização | Quando usar |
|-------|------------|-------------|
| **TDD** | `skills/tdd/SKILL.md` | SEMPRE — é o método de desenvolvimento |
| **WhatsApp** | `skills/whatsapp/SKILL.md` | Módulo WA, Evolution API, n8n, fluxos de conversa |
| **Subscrições** | `skills/subscricoes/SKILL.md` | Planos, billing, enforcement, grace period |
| **Financeiro** | `skills/SKILL-financeiro.md` | Faturas, pagamentos, seguros, relatórios |
| **Plataforma** | `skills/SKILL-plataforma.md` | API keys, webhooks, plan limits |
| **RBAC** | `skills/SKILL-rbac.md` | Permissões granulares, requirePermission |
| **BullMQ** | `skills/SKILL-redis-bullmq.md` | Jobs assíncronos, filas, workers |
| **WebSocket** | `skills/SKILL-websocket.md` | Eventos real-time, publishEvent, rooms |

---

## Árvore de decisão

```
Estou a implementar algo novo?
  └─► SEMPRE lê SKILL-tdd primeiro

Estou a tocar no módulo WhatsApp?
  └─► skills/whatsapp/SKILL.md
      + skills/tdd/reference/mocks-externos.md (mocks para evo e n8n)

Estou a tocar em planos, subscriptions, ou billing?
  └─► skills/subscricoes/SKILL.md

Estou a criar um endpoint novo?
  └─► Verificar se precisa de requirePlan() → skills/subscricoes/reference/enforcement.md
  └─► Verificar se precisa de requirePermission() → skills/SKILL-rbac.md

Estou a criar um job assíncrono?
  └─► skills/SKILL-redis-bullmq.md
  └─► Se for lembrete WA → skills/whatsapp/SKILL.md também

Estou a enviar notificação em tempo real?
  └─► skills/SKILL-websocket.md

Estou a criar um componente React com feature gating?
  └─► skills/subscricoes/resources/PlanGate.tsx
  └─► skills/subscricoes/reference/enforcement.md (Camada 2)
```

---

## Dependências entre skills

```
TDD ◄────────────── todas as outras skills dependem do TDD

WhatsApp ──────────► TDD (ciclo obrigatório)
         ──────────► BullMQ (jobs de lembrete)
         ──────────► WebSocket (notificações)
         ──────────► RBAC (requirePermission)
         ──────────► Subscrições (requirePlan PRO)

Subscrições ───────► BullMQ (jobs de expiração)
            ───────► Financeiro (invoices de subscrição)
            ───────► WebSocket (notificar estado)

Plataforma ────────► Subscrições (plan limits)
           ────────► RBAC (scopes de API key)

Financeiro ────────► RBAC (permissões por role)
```

---

## Scripts disponíveis

| Script | Bash | PowerShell | O que faz |
|--------|------|-----------|-----------|
| Health check | `bash/health-check.sh` | `powershell/health-check.ps1` | API + Evolution API + n8n + Redis |
| Migrate | `bash/migrate.sh` | `powershell/migrate.ps1` | Valida + migra + seeds |
| Smoke test | `bash/smoke-test.sh` | `powershell/smoke-test.ps1` | Testa endpoints críticos pós-deploy |
| Seed dados teste | `bash/seed-test-data.sh` | `powershell/seed-test-data.ps1` | Dados realistas pt-AO |
| Backup DB | `bash/backup-db.sh` | `powershell/backup-db.ps1` | pg_dump + compress + upload |
| Check Redis | `check-redis.sh` | — | Estado das filas BullMQ |
| Migrate v2 | `migrate-v2.sh` | — | Migration específica v2 |
| Seed planos | `seed-planos.sh` | — | Seed idempotente de plano_limites |
