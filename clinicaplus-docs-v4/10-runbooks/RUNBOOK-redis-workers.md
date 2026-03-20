# Runbook: Redis e Workers (BullMQ)

---

## Diagnóstico Rápido

| Sintoma | Causa Provável | Secção |
|---------|----------------|--------|
| Lembretes não chegam | Worker down ou Redis desligado | 1 |
| Webhooks com falhas repetidas | URL do cliente down | 2 |
| `redis: "disconnected"` no /health | Upstash fora ou limite atingido | 3 |
| Worker reinicia em loop | Crash na startup (DB, Redis, env vars) | 4 |

---

## 1. Lembretes Não Chegam

```bash
# Passo 1: verificar estado do Worker
# Railway → Worker service → Logs
# Procurar: erros de startup, "ECONNREFUSED", stack traces

# Passo 2: verificar fila de reminders no Redis (via Upstash Console)
# Upstash dashboard → Data Browser → procurar chaves "bull:cp:reminders:*"
# Se a fila estiver vazia: o API não está a enfileirar
# Se a fila tiver jobs "waiting": o Worker não está a consumir

# Passo 3: testar criação manual de job (em desenvolvimento)
# node -e "
#   const { Queue } = require('bullmq');
#   const q = new Queue('cp:reminders', { connection: { url: process.env.REDIS_URL } });
#   q.add('test', { agendamentoId: 'TEST', tipo: '24h' }).then(() => process.exit(0));
# "

# Passo 4: se Worker está down → Railway → Worker → Redeploy
# Jobs sobrevivem ao restart (persistidos no Redis)
```

---

## 2. Webhooks a Falhar

```bash
# Ver histórico de entregas via API:
# GET /api/webhooks/:id/entregas
# Campo "tentativas" mostra quantas vezes foi tentado (máx 5)
# Campo "sucesso: false" + "tentativas: 5" = dead-letter

# Reenviar manualmente uma entrega:
# POST /api/webhooks/:id/entregas/:entregaId/reenviar

# Se a URL do cliente está permanentemente down:
# PATCH /api/webhooks/:id { "ativo": false }
# Notificar o cliente da integração

# Ver jobs na dead-letter queue (Upstash Console → cp:webhooks:failed)
# Se acumulando: verificar se URL do cliente está acessível
```

---

## 3. Redis Desconectado

```bash
# Upstash free tier: 10.000 comandos/dia
# Em produção com lembretes activos este limite é ultrapassado rapidamente
# Verificar: dashboard.upstash.com → Usage

# Upgrade para Pay-as-you-go:
# Upstash Dashboard → Database → Upgrade
# Custo estimado: ~$2-5/mês para uma clínica com 50 consultas/dia

# Comportamento quando Redis está down:
# ✅ REST API continua a funcionar (JWT auth não usa Redis)
# ✅ Autenticação continua (JWT verificado localmente)
# ❌ WebSocket indisponível (pub/sub depende de Redis)
# ❌ Jobs novos não enfileirados (lembretes perdem-se)
# ⚠  Cache RBAC bypassa para DB (mais lento mas funcional)
# /health retorna: { "status": "degraded", "redis": "disconnected" }
```

---

## 4. Worker em Crash Loop

```bash
# Railway → Worker → Logs → procurar a causa do crash

# Causas comuns:
# a) REDIS_URL inválido → "Connection refused" ou "WRONGPASS"
#    Fix: verificar Railway Worker Variables → REDIS_URL
#
# b) DATABASE_URL inválido → Prisma connection error
#    Fix: verificar Railway Worker Variables → DATABASE_URL
#
# c) Erro de TypeScript em runtime → import de módulo que não existe
#    Fix: pnpm build --filter=worker localmente → verificar erros
#
# d) OOM (out of memory) → concurrency demasiado alto
#    Fix: reduzir concurrency no worker (default 10 → 5)
#    Em apps/worker/src/workers/email.worker.ts:
#    { connection: redis, concurrency: 5 }

# Após fix: Railway → Worker → Redeploy
# Jobs pendentes no Redis são processados automaticamente ao reiniciar
```

---

## 5. Inspecção Manual de Filas

```bash
# Usar ioredis CLI ou redis-cli com REDIS_URL:
redis-cli -u "$REDIS_URL" --tls

# Tamanho das filas:
llen bull:cp:emails:wait
llen bull:cp:reminders:wait
llen bull:cp:webhooks:wait
llen bull:cp:reports:wait

# Jobs em falha:
llen bull:cp:emails:failed
llen bull:cp:webhooks:failed

# Limpar dead-letter (irreversível):
del bull:cp:webhooks:failed

# Ver um job específico:
hgetall bull:cp:reminders:jobs:<job-id>
```
