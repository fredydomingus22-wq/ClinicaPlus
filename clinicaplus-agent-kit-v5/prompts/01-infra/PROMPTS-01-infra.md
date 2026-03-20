# Sprint 1 — Infraestrutura Assíncrona

**Skill:** `SKILL-redis-bullmq.md`
**Risco:** Zero — apps/worker é um novo processo paralelo. API não muda.

---

## Prompt 1.1 — packages/events + apps/worker

```
Lê SKILL-redis-bullmq.md na íntegra.
Lê docs/CLAUDE-v2.md (regras novas, secção 2).

Cria packages/events/ com @clinicaplus/events:
  src/
    jobs.ts       — tipos: EmailJob, ReminderJob, WebhookJob, ReportJob
    events.ts     — tipos: SocketEvents interface com todos os eventos do servidor
    index.ts      — re-exporta tudo
  package.json    — name: "@clinicaplus/events", main: "dist/index.js"
  tsconfig.json   — extende o tsconfig root

Tipos de jobs (ver SKILL secção 2 para referência):
  EmailJob:    { to: string; template: 'reminder'|'registration'|'fatura'; data: Record<string,unknown> }
  ReminderJob: { agendamentoId: string; tipo: '24h'|'2h' }
  WebhookJob:  { webhookId: string; entregaId: string; tentativa: number }
  ReportJob:   { clinicaId: string; tipo: 'receita'|'ocupacao'; parametros: Record<string,unknown>; requestedBy: string }

Tipos de eventos WebSocket:
  'agendamento:criado'  → { agendamentoId: string; dataHora: string; pacienteNome: string }
  'agendamento:estado'  → { agendamentoId: string; novoEstado: string; anteriorEstado: string }
  'agendamento:triagem' → { agendamentoId: string }
  'fatura:emitida'      → { faturaId: string; pacienteId: string; total: number }
  'notificacao'         → { tipo: string; mensagem: string; link?: string }

Cria apps/worker/ com estrutura completa:
  package.json — scripts: build, start, dev
  tsconfig.json
  src/
    index.ts              — importa e inicia os 4 workers, SIGTERM graceful shutdown
    lib/
      redis.ts            — cliente ioredis singleton (copiar padrão de docs/BACKEND_v2.md)
      queues.ts           — define as 4 filas BullMQ (consumer side)
      prisma.ts           — singleton idêntico ao do API
      logger.ts           — Pino JSON, mesmo config
    workers/
      email.worker.ts     — template completo (ver docs/BACKEND_v2.md secção 9)
      reminder.worker.ts  — template completo (ver docs/BACKEND_v2.md secção 9)
      webhook.worker.ts   — stub: log "webhook worker not yet implemented"
      report.worker.ts    — stub: log "report worker not yet implemented"

Adiciona @clinicaplus/events ao turbo.json pipeline.
Adiciona @clinicaplus/events como dependência de apps/api, apps/web, apps/worker (workspace:*).
Instala dependências em apps/worker: bullmq ioredis @prisma/client pino resend

Corre:
  pnpm install
  pnpm build --filter=@clinicaplus/events
  pnpm build --filter=worker
  pnpm typecheck --filter=worker

Reporta o output. Zero erros esperados.
```

**Verificação:**
```bash
pnpm typecheck   # zero erros em todos os packages
```

---

## Prompt 1.2 — Redis no API + Migrar Scheduler

```
Lê SKILL-redis-bullmq.md.
Lê docs/BACKEND_v2.md (secções 2, 3, 10).

1. Adiciona a apps/api/src/lib/:
   redis.ts    — cliente ioredis singleton + redisSub separado (ver BACKEND_v2.md secção 2)
   queues.ts   — 4 filas BullMQ (producer side) (ver BACKEND_v2.md secção 3)

2. Actualiza apps/api/src/lib/config.ts:
   Adicionar REDIS_URL como variável obrigatória (server crash se em falta)

3. Actualiza apps/api/src/server.ts:
   - Verificar Redis no startup: await redis.ping().catch(() => logger.warn('Redis unavailable'))
   - Actualizar /health para incluir: "redis": "connected" | "disconnected"
   - IMPORTANTE: continuar a usar app.listen (Socket.io só no Sprint 2)

4. Actualiza apps/api/src/services/agendamentos.service.ts:
   Após prisma.agendamento.create() confirmar:
   - Calcular delays para 24h e 2h antes de dataHora
   - reminderQueue.add() com jobId único para cada tipo
   - attempts: 3, backoff exponential 1h

   No updateEstado(), quando novoEstado === 'CANCELADO':
   - reminderQueue.remove(`reminder-24h-${agendamentoId}`)
   - reminderQueue.remove(`reminder-2h-${agendamentoId}`)

5. Actualiza apps/api/src/services/scheduler.service.ts:
   Substituir a lógica de envio directo por:
   - Buscar LembreteAgendamento WHERE enviadoEm IS NULL AND agendadoPara <= now() + 2h
   - Para cada: reminderQueue.add() com jobId único
   - Worker faz o envio efectivo — scheduler só agenda
   - Remover import do Resend do scheduler

6. Instala em apps/api: bullmq ioredis

7. Corre:
   pnpm build --filter=api
   pnpm typecheck --filter=api
   pnpm test --run --filter=api

Testa manualmente:
   REDIS_URL=<upstash> pnpm dev --filter=api
   curl http://localhost:3001/health
   → deve mostrar "redis": "connected"
```

---

## Prompt 1.3 — Deploy e Verificação

```
1. Cria apps/worker/src/lib/config.ts com:
   Validação das variáveis obrigatórias: DATABASE_URL, DIRECT_URL, REDIS_URL, RESEND_API_KEY
   Server crash com mensagem clara se alguma faltar

2. Adiciona ao turbo.json os scripts do worker

3. Cria apps/worker/.env.example com as variáveis necessárias

4. Actualiza docs/09-deployment/DEPLOYMENT_v2.md se necessário (já existe, verificar)

5. Faz push da branch e verifica que o CI passa:
   git push origin feat/v2-sprint-1

6. No Railway: criar o Worker service (ver DEPLOYMENT_v2.md secção 2)
   Configurar as variáveis de ambiente
   Verificar que o Worker arranca sem erros

7. Testa end-to-end em produção:
   - Criar agendamento para amanhã
   - Verificar nos logs do Railway Worker que o reminder job foi recebido e agendado

Checkpoint Sprint 1:
   - [ ] curl https://api.clinicaplus.ao/health → "redis": "connected"
   - [ ] Criar agendamento → Railway Worker logs mostram reminder agendado
   - [ ] Cancelar agendamento → nenhum lembrete enviado
   - [ ] pnpm test --run zero falhas
   - [ ] CI verde na branch
```

---

