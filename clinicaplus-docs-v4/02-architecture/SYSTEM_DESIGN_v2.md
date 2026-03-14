# ClinicaPlus v2 — System Design

Delta em relação a `02-architecture/SYSTEM_DESIGN.md` da v1.

---

## 1. Infraestrutura v2

```
[Browser / PWA]
    │
    │  React SPA — Vercel CDN
    │  WebSocket → wss://api.clinicaplus.ao/ws
    │
    ▼  HTTPS REST + WebSocket
    │
[Railway — API Container]
    ├── Express REST          :3001
    ├── Socket.io server      /ws  (mesmo processo)
    ├── BullMQ producers      → Redis queues
    └── Redis pub/sub sub     → reencaminhar para WS rooms
    │
    ▼  Prisma ORM (port 6543 PgBouncer)
[Supabase PostgreSQL 15]

[Railway — Worker Container]   ← NOVO
    ├── email.worker          consome cp:emails
    ├── reminder.worker       consome cp:reminders
    ├── webhook.worker        consome cp:webhooks
    └── report.worker         consome cp:reports
    │
    ▼  BullMQ consumer
[Upstash Redis]   ← NOVO
    ├── Filas BullMQ
    ├── Redis pub/sub
    └── Cache de permissões RBAC
```

---

## 2. Monorepo Package Graph v2

```
apps/api    ──► @clinicaplus/types
            ──► @clinicaplus/events   ← NOVO
apps/web    ──► @clinicaplus/types
            ──► @clinicaplus/ui
            ──► @clinicaplus/utils
            ──► @clinicaplus/events   ← NOVO
apps/worker ──► @clinicaplus/types
            ──► @clinicaplus/events   ← NOVO
packages/events ──► @clinicaplus/types
```

---

## 3. Fluxo de Evento (padrão para todas as mutações v2)

```
Acção do utilizador (ex: criar agendamento)
    │
    ▼
Route → Zod.parse() → agendamentosService.create()
    │
    ▼
prisma.agendamento.create()          ← 1. persiste
    │
    ├── redis.publish(evento)         ← 2. notifica clientes WS
    │       └── Socket.io → room clinica:X → invalidate queries
    │
    ├── reminderQueue.add(job, delay) ← 3. agenda lembretes
    │       └── Worker envia email ao paciente no momento certo
    │
    └── webhookQueue.add(job)         ← 4. notifica integrações externas
            └── Worker entrega POST assinado ao cliente
```

Passos 2, 3, 4 são **fire-and-forget após commit**. Se falharem, não revertem a mutação.
A persistência e o retry são responsabilidade do BullMQ (3, 4) e do Redis pub/sub (2).

---

## 4. Módulo Financeiro — Ciclo de Vida

```
Agendamento CONCLUIDO
    │
    ├─ faturaAutomatica=true  → RASCUNHO criado automaticamente
    └─ faturaAutomatica=false → recepcionista cria manualmente
    │
    ▼
RASCUNHO ──emitir()──► EMITIDA
                            │
                            ├──registarPagamento()──► (parcial → EMITIDA)
                            │                         (total   → PAGA)
                            │
                            └──anular()──► ANULADA (terminal)
```

---

## 5. RBAC — Fluxo de Verificação

```
requirePermission(userId, 'fatura', 'void')
    │
    ▼
Redis GET perm:{userId}:fatura:void     ← cache hit? → return
    │
    ▼ cache miss
DB: RolePermissao WHERE papel = user.papel
    │
    ▼
DB: UtilizadorPermissao WHERE utilizadorId = userId
    │
    ▼
Resolve: base + override (GRANT prevalece, DENY prevalece sobre base)
    │
    ▼
Redis SETEX perm:{userId}:fatura:void 300 "1"|"0"    ← cachear 5min
    │
    ▼
true → continuar | false → AppError(403, 'FORBIDDEN')
```

---

## 6. API Keys — Fluxo de Autenticação

```
Request com X-Api-Key: cp_live_xxx...
    │
    ▼
apiKeyAuth middleware
    │
    ├── SHA-256(raw key) → lookup por hash no DB
    ├── Verificar: ativo, não expirada, clinicaId correcto
    ├── Verificar scope necessário para o endpoint
    ├── Rate limit por key (Redis counter, TTL 1h)
    └── Populate req.user e req.clinica (igual ao JWT middleware)
    │
    ▼
Route handler — sem diferença de lógica vs autenticação JWT
```

---

## 7. Performance Targets v2

| Métrica | v1 | v2 |
|---------|----|----|
| DB queries p95 | < 100ms | < 80ms (Redis cache em permissões) |
| API list p95 | < 200ms | < 150ms |
| WS event delivery | — | < 500ms |
| Lembrete delivery | ±60s (cron) | ±5s (BullMQ) |
| Cache hit rate (RBAC) | — | > 90% |
| Webhook delivery p95 | — | < 2s |
| Bundle frontend | < 150KB | < 150KB (lazy loading mantido) |
