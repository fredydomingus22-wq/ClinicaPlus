# SKILL: Redis + BullMQ

Lê antes de qualquer tarefa com filas, workers, lembretes assíncronos, ou apps/worker/.

---

## Regra 1 — Quando Usar BullMQ

```
BullMQ → jobs que precisam de: persistência, retry, delay futuro, ou execução out-of-process
node-cron → apenas para triggering de scan periódico (não para a execução em si)
setTimeout → nunca para lógica de negócio crítica
```

## Regra 2 — Job IDs Únicos (Idempotência)

```typescript
// jobId garante que BullMQ não cria duplicados
await reminderQueue.add('send-reminder',
  { agendamentoId, tipo: '24h' },
  {
    jobId: `reminder-24h-${agendamentoId}`,  // ← único
    delay: calcularDelay(dataHora, 24),
    attempts: 3,
    backoff: { type: 'exponential', delay: 3_600_000 },
    removeOnComplete: true,
    removeOnFail: { count: 100 },
  }
);

// Cancelar ao cancelar o agendamento:
await reminderQueue.remove(`reminder-24h-${agendamentoId}`);
await reminderQueue.remove(`reminder-2h-${agendamentoId}`);
```

## Regra 3 — Enfileirar DEPOIS do DB Confirmar

```typescript
// CORRECTO:
const ag = await prisma.agendamento.create({ data: {...} });
await reminderQueue.add('reminder', { agendamentoId: ag.id }, { jobId: `...` });

// ERRADO — se o prisma falhar, o job fica órfão:
await reminderQueue.add('reminder', { agendamentoId: 'id-que-pode-nao-existir' });
await prisma.agendamento.create({ data: {...} });
```

## Template de Worker

```typescript
export const emailWorker = new Worker<EmailJob>(
  'cp:emails',
  async (job) => {
    const log = logger.child({ jobId: job.id, template: job.data.template });
    log.info('Processing');
    // ... lógica
    log.info('Done');
  },
  { connection: redis, concurrency: 20, attempts: 3, backoff: { type: 'exponential', delay: 300_000 } }
);

emailWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err: err.message }, 'Job failed'));
```

## Checklist

- [ ] Todos os jobs têm `jobId` único
- [ ] Jobs enfileirados DEPOIS do commit no DB
- [ ] `removeOnComplete: true` em workers de alto volume
- [ ] SIGTERM handler em `apps/worker/src/index.ts`
- [ ] `cancelar agendamento` → remover jobs de lembrete da fila
