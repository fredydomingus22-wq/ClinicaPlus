# ClinicaPlus v2 — Agent Instructions

Lê também o `CLAUDE.md` original — todas as regras da v1 continuam válidas.
Este ficheiro documenta apenas o que é **novo ou muda** na v2.

---

## 1. Novos Componentes de Infraestrutura

```
Redis (Upstash)     Cache + pub/sub + filas BullMQ
BullMQ              Jobs assíncronos: lembretes, emails, webhooks, relatórios
Socket.io           WebSocket server para actualizações em tempo real
apps/worker/        Novo processo Railway — consome filas BullMQ
packages/events/    @clinicaplus/events — tipos partilhados de jobs e eventos
```

---

## 2. Regras Novas (adicionam-se às 8 regras do CLAUDE.md)

```
9.  Jobs assíncronos críticos → BullMQ. NUNCA setTimeout/setInterval para lógica de negócio.
10. Eventos de negócio → redis.publish() DEPOIS do commit no DB. Nunca antes.
11. API keys → guardar SHA-256 do token. NUNCA o token completo no DB ou nos logs.
12. Webhooks → entregar via BullMQ queue. NUNCA fetch() síncrono em route handler.
13. Permissões → verificar via permissaoService.requirePermission(). Não só pelo papel.
14. AuditLog → todas as mutações financeiras e acções sensíveis têm entrada.
15. Plan enforcement → verificar ANTES de criar recurso. Lança AppError 402.
16. Workers → zero req/res. Recebem Job do BullMQ, processam, retornam ou lançam erro.
```

---

## 3. Stack Adicionada (Non-Negotiable)

| Componente | Tecnologia | Nota |
|-----------|-----------|------|
| Filas | BullMQ + ioredis | Redis obrigatório |
| Redis | Upstash Redis | Serverless, TLS, Railway-compatible |
| WebSocket | Socket.io | Mesmo processo que o Express |
| E2E Tests | Playwright | Chromium + Firefox |
| Load Tests | k6 | Script JS, CI-friendly |

---

## 4. Novas Variáveis de Ambiente

```bash
# apps/api/.env — adicionar às existentes da v1

REDIS_URL=rediss://default:<password>@<host>.upstash.io:6379
WEBHOOK_SIGNING_SECRET=<openssl rand -base64 64>
API_KEY_SALT=<openssl rand -base64 32>
```

```bash
# apps/worker/.env — processo separado, apenas o que precisa

DATABASE_URL=<supabase port 6543>
DIRECT_URL=<supabase port 5432>
REDIS_URL=<mesmo que api>
RESEND_API_KEY=<mesmo que api>
NODE_ENV=production
ALERT_EMAIL=<email para alertas de falhas>
```

---

## 5. Monorepo Actualizado

```
clinicaplus/
├── apps/
│   ├── api/          ← sem alterações estruturais
│   ├── web/          ← sem alterações estruturais
│   └── worker/       ← NOVO: processo BullMQ independente
├── packages/
│   ├── types/        ← expandido com schemas financeiros
│   ├── ui/           ← expandido com componentes financeiros
│   ├── utils/        ← sem alterações
│   └── events/       ← NOVO: tipos partilhados de jobs e eventos WS
```

---

## 6. Checklist Adicional Antes de Commit (v2)

Ao checklist original da v1, adicionar:

- [ ] Jobs críticos usam BullMQ com `jobId` único (idempotência)
- [ ] redis.publish() chamado DEPOIS de prisma confirmar a mutação
- [ ] Mutações financeiras têm `auditLogService.log()` com `antes` e `depois`
- [ ] Criação de recursos verifica `planEnforcementService.check()` primeiro
- [ ] API keys: hash SHA-256 guardado, token nunca aparece em logs
- [ ] Webhooks entregues via `webhookQueue.add()`, nunca via `fetch()` síncrono
- [ ] `pnpm test --run --filter=worker` zero falhas
