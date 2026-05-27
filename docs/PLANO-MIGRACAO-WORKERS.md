# Plano de Migração: Workers Assíncronos para apps/worker

## Objetivo

Eliminar o anti-pattern de workers inline no `apps/api`, movendo toda a carga assíncrona para `apps/worker` com filas BullMQ, garantindo:
- API leve e responsiva (sem bloqueio de event loop)
- Isolamento de falhas (crash de worker não derruba API)
- Escalabilidade independente (escalar workers sem escalar API)
- Graceful shutdown correto em ambos os serviços

## Stack Escolhido

**BullMQ** (já presente no projeto) em vez de Celery Beat:
- Nativo para Node.js/TypeScript
- Integração com Redis (já usado)
- Suporte a delayed jobs, repeatable jobs, priorities
- Dashboard de monitoramento (Bull Board)
- Menor overhead que Celery (sem Python/Redis adicional)

## Arquitetura Atual vs Alvo

### Atual (Anti-pattern)

```
apps/api
├── server.ts (Express + Socket.io)
├── workers/tratamento.worker.ts (inline - BLOQUEIA EVENT LOOP)
├── services/pdf.service.ts (Puppeteer singleton - MEMORY LEAK)
└── services/scheduler.service.ts (node-cron inline - BLOQUEIA EVENT LOOP)

apps/worker
├── email.worker.ts
├── reminder.worker.ts
├── webhook.worker.ts
└── report.worker.ts
```

### Alvo (Arquitetura Limpa)

```
apps/api
├── server.ts (Express + Socket.io - LEVE)
├── lib/queues.ts (apenas Queue definitions - sem Workers)
└── routes/* (apenas enfileirar jobs - sem processamento síncrono)

apps/worker
├── index.ts (orquestrador de todos os workers)
├── workers/
│   ├── email.worker.ts
│   ├── reminder.worker.ts
│   ├── webhook.worker.ts
│   ├── report.worker.ts
│   ├── tratamento.worker.ts (MOVIDO do API)
│   ├── pdf.worker.ts (NOVO - Puppeteer isolado)
│   └── scheduler.worker.ts (NOVO - substitui node-cron do API)
└── lib/
    ├── redis.ts (compartilhado)
    ├── prisma.ts (compartilhado)
    └── locks.ts (Redlock para race conditions)
```

## Fases de Implementação

### Fase 1: Preparação (Bloqueadores Críticos)

**1.1 Corrigir graceful shutdown do API**
- Arquivo: `apps/api/src/server.ts`
- Problema: Não fecha HTTP server, Socket.io, nem worker inline
- Solução:
  ```typescript
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, `Received ${signal} — shutting down gracefully`);
    try {
      schedulerService.stop();
      httpServer.close(); // ADICIONAR
      io.close(); // ADICIONAR
      tratamentoWorker.close(); // ADICIONAR (antes de mover)
      await Promise.all([
        prisma.$disconnect(),
        redis.quit(),
        redisSub.quit()
      ]);
      process.exit(0);
    } catch (err: unknown) {
      logger.error({ err }, '❌ Error during shutdown');
      process.exit(1);
    }
  };
  ```

**1.2 Implementar locks distribuídos (Redlock)**
- Arquivo: `apps/worker/src/lib/locks.ts` (NOVO)
- Objetivo: Prevenir race conditions em workers concorrentes
- Biblioteca: `redlock` (npm install redlock)
- Exemplo:
  ```typescript
  import { Redlock } from 'redlock';
  import { redis } from './redis';

  export const redlock = new Redlock(
    [redis],
    {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 200,
      retryJitter: 200,
    }
  );

  export async function withLock<T>(
    resource: string,
    ttl: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const lock = await redlock.acquire([resource], ttl);
    try {
      return await fn();
    } finally {
      await lock.release();
    }
  }
  ```

### Fase 2: Mover Tratamento Worker

**2.1 Mover arquivo**
- De: `apps/api/src/workers/tratamento.worker.ts`
- Para: `apps/worker/src/workers/tratamento.worker.ts`
- Ajustes:
  - Importar `prisma` e `redis` de `apps/worker/src/lib`
  - Remover import de `JobNames` de `@clinicaplus/events` (se necessário, manter)
  - Adicionar lock distribuído para idempotência:
    ```typescript
    export const tratamentoWorker = new Worker<TratamentoGerarSessoesJob>(
      JobNames.TRATAMENTO_GERAR_SESSOES,
      async (job: Job<TratamentoGerarSessoesJob>) => {
        const { planoId, clinicaId } = job.data;
        const lockKey = `tratamento:gerar-sessoes:${planoId}`;

        return withLock(lockKey, 30000, async () => {
          // Lógica existente com verificação de idempotência
          const sessoesExistentes = await prisma.sessaoTratamento.count({
            where: { planoId, clinicaId }
          });
          if (sessoesExistentes > 0) {
            logger.warn({ planoId, clinicaId }, '⚠️ Sessões já existem. Ignorando.');
            return;
          }
          // ... restante da lógica
        });
      },
      { connection: redis, concurrency: 5 }
    );
    ```

**2.2 Atualizar API**
- Arquivo: `apps/api/src/server.ts`
- Remover: `import './workers/tratamento.worker';`
- Manter: Queue definitions em `lib/queues.ts` (apenas enfileirar)

**2.3 Atualizar Worker**
- Arquivo: `apps/worker/src/index.ts`
- Adicionar: `import { tratamentoWorker } from './workers/tratamento.worker';`
- Adicionar ao graceful shutdown: `tratamentoWorker.close()`

### Fase 3: Criar PDF Worker (Puppeteer Isolado)

**3.1 Criar worker**
- Arquivo: `apps/worker/src/workers/pdf.worker.ts` (NOVO)
- Objetivo: Isolar Puppeteer do API (memory leak fix)
- Implementação:
  ```typescript
  import { Worker, Job } from 'bullmq';
  import puppeteer from 'puppeteer';
  import { redis } from '../lib/redis';
  import { logger } from '../lib/logger';

  interface PdfJobData {
    type: 'consulta' | 'resumo';
    agendamentoId: string;
    clinicaId: string;
  }

  export const pdfWorker = new Worker<PdfJobData>(
    'pdf-generation',
    async (job: Job<PdfJobData>) => {
      const { type, agendamentoId, clinicaId } = job.data;
      logger.info({ jobId: job.id, type }, 'Starting PDF generation');

      let browser;
      try {
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        // Lógica de geração de PDF (copiada de pdf.service.ts)
        // ...

        return { success: true, pdfPath };
      } finally {
        if (browser) await browser.close();
      }
    },
    { connection: redis, concurrency: 2 } // Limitar concurrency (Puppeteer pesado)
  );

  pdfWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'PDF generation completed');
  });

  pdfWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'PDF generation failed');
  });
  ```

**3.2 Atualizar API**
- Arquivo: `apps/api/src/services/pdf.service.ts`
- Remover: Puppeteer singleton (browser)
- Substituir por: Enfileirar job no `pdfQueue`
- Exemplo:
  ```typescript
  async generateConsultaReport(agendamentoId: string, clinicaId: string): Promise<Buffer> {
    // Enfileirar job e aguardar resultado (ou retornar ID para polling)
    const job = await pdfQueue.add('pdf-generation', {
      type: 'consulta',
      agendamentoId,
      clinicaId,
    });

    // Opção 1: Aguardar resultado (síncrono para API)
    const result = await job.waitUntilFinished(queueEvents, 30000);
    return result.pdfBuffer;

    // Opção 2: Retornar ID para polling (assíncrono ideal)
    // return { jobId: job.id };
  }
  ```

**3.3 Atualizar Worker**
- Arquivo: `apps/worker/src/index.ts`
- Adicionar: `import { pdfWorker } from './workers/pdf.worker';`
- Adicionar ao graceful shutdown: `pdfWorker.close()`

### Fase 4: Mover Scheduler para Worker

**4.1 Criar scheduler worker**
- Arquivo: `apps/worker/src/workers/scheduler.worker.ts` (NOVO)
- Objetivo: Substituir `node-cron` do API por BullMQ repeatable jobs
- Implementação:
  ```typescript
  import { Queue } from 'bullmq';
  import { redis } from '../lib/redis';
  import { logger } from '../lib/logger';

  export const schedulerQueue = new Queue('scheduler', { connection: redis });

  // Agendar jobs recorrentes
  async function setupScheduler() {
    // Lembretes de agendamento (verificar a cada hora)
    await schedulerQueue.add(
      'check-appointment-reminders',
      {},
      {
        repeat: { pattern: '0 * * * *' }, // Cada hora
        jobId: 'check-appointment-reminders',
      }
    );

    // Limpeza de jobs expirados (diariamente)
    await schedulerQueue.add(
      'cleanup-expired-jobs',
      {},
      {
        repeat: { pattern: '0 2 * * *' }, // 2h da manhã
        jobId: 'cleanup-expired-jobs',
      }
    );

    logger.info('Scheduler jobs configured');
  }

  // Worker para processar jobs do scheduler
  export const schedulerWorker = new Worker(
    'scheduler',
    async (job) => {
      const { name } = job;
      logger.info({ jobId: job.id, name }, 'Processing scheduler job');

      switch (name) {
        case 'check-appointment-reminders':
          // Lógica de verificação de lembretes
          break;
        case 'cleanup-expired-jobs':
          // Lógica de limpeza
          break;
      }
    },
    { connection: redis }
  );
  ```

**4.2 Atualizar API**
- Arquivo: `apps/api/src/server.ts`
- Remover: `schedulerService.start()`
- Remover: `import { schedulerService } from './services/scheduler.service';`

**4.3 Atualizar Worker**
- Arquivo: `apps/worker/src/index.ts`
- Adicionar: `import { setupScheduler, schedulerWorker } from './workers/scheduler.worker';`
- Chamar: `setupScheduler()` no `main()`
- Adicionar ao graceful shutdown: `schedulerWorker.close()`

### Fase 5: Corrigir Graceful Shutdown do Worker

**5.1 Atualizar worker**
- Arquivo: `apps/worker/src/index.ts`
- Problema: Não fecha HTTP server (healthcheck)
- Solução:
  ```typescript
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully...');
    
    await Promise.all([
      healthServer.close(),
      emailWorker.close(),
      reminderWorker.close(),
      webhookWorker.close(),
      reportWorker.close(),
      reportAgtWorker.close(),
      criarSessoesWorker.close(),
      appointmentExpirationWorker.close(),
      tratamentoWorker.close(), // ADICIONAR
      pdfWorker.close(), // ADICIONAR
      schedulerWorker.close(), // ADICIONAR
    ]);

    await redis.quit();
    await prisma.$disconnect();
    
    logger.info('Worker stopped');
    process.exit(0);
  };
  ```

### Fase 6: Validação e Testes

**6.1 Testes de integração**
- Criar testes para cada worker (Vitest)
- Testar graceful shutdown (simular SIGTERM/SIGINT)
- Testar locks distribuídos (simular concorrência)
- Testar PDF worker (verificar memory leak com monitoramento)

**6.2 Monitoramento**
- Implementar Bull Board (dashboard de filas)
- Adicionar métricas de jobs (success/fail/latency)
- Configurar alertas para filas com backlog alto

**6.3 Rollback plan**
- Manter branch de rollback com arquivos originais
- Documentar processo de rollback rápido (reverter commits)
- Testar rollback em staging

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|----------|------------|
| Worker crash deixa jobs pendentes | Alto | BullMQ persiste jobs no Redis; worker ao retomar processa pendentes |
| Redis downtime bloqueia tudo | Alto | Implementar fallback/queue local ou retry com backoff |
| PDF worker memory leak | Médio | Limitar concurrency (2), fechar browser em finally, monitorar memória |
| Race condition em migração | Médio | Usar locks distribuídos (Redlock) durante transição |
| Latência aumentada (API → Worker → API) | Baixo | Implementar resposta síncrona via `job.waitUntilFinished()` para críticos |

## Cronograma Estimado

- Fase 1: 2h (preparação crítica)
- Fase 2: 1h (mover tratamento worker)
- Fase 3: 3h (criar PDF worker)
- Fase 4: 2h (mover scheduler)
- Fase 5: 1h (graceful shutdown)
- Fase 6: 4h (validação e testes)

**Total:** ~13h (2 dias de trabalho focado)

## Próximos Passos

1. Aprovar plano
2. Implementar Fase 1 (bloqueadores críticos)
3. Implementar Fases 2-5 sequencialmente
4. Validar com testes de integração
5. Deploy em staging
6. Monitorar por 24h antes de produção
