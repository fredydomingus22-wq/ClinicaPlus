# ClinicaPlus v2 — Backend (Delta)

Delta em relação a `03-backend/BACKEND.md` (v1).

---

## 1. Novos Ficheiros em apps/api/src/

```
src/
├── lib/
│   ├── redis.ts           cliente ioredis singleton + redisSub para pub/sub
│   ├── queues.ts          definição das 4 filas BullMQ
│   ├── socket.ts          setupSocket() — Socket.io + auth + rooms + pub/sub bridge
│   └── eventBus.ts        publishEvent(room, event, data) — abstracção sobre redis.publish
│
├── middleware/
│   └── apiKeyAuth.ts      autenticação por API key (hash lookup + scope check)
│
├── services/
│   ├── faturas.service.ts
│   ├── pagamentos.service.ts
│   ├── apikeys.service.ts
│   ├── webhooks.service.ts
│   ├── permissao.service.ts
│   ├── auditLog.service.ts
│   └── planEnforcement.service.ts
│
└── routes/
    ├── faturas.ts
    ├── relatorios.ts
    ├── audit-logs.ts
    ├── api-keys.ts
    ├── webhooks.ts
    └── public/
        └── v1/
            ├── index.ts
            ├── pacientes.ts
            └── agendamentos.ts
```

---

## 2. lib/redis.ts

```typescript
import Redis from 'ioredis';
import { config } from './config';

// Cliente principal (GET, SET, PUBLISH)
export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (t) => Math.min(t * 200, 2000),
  lazyConnect: false,
  enableReadyCheck: true,
});

// Cliente separado apenas para SUBSCRIBE (ioredis não permite outros comandos durante subscribe)
export const redisSub = new Redis(config.REDIS_URL);

redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));
```

---

## 3. lib/queues.ts

```typescript
import { Queue } from 'bullmq';
import { redis } from './redis';
import type { EmailJob, ReminderJob, WebhookJob, ReportJob } from '@clinicaplus/events';

const connection = redis;

export const emailQueue    = new Queue<EmailJob>   ('cp:emails',    { connection });
export const reminderQueue = new Queue<ReminderJob>('cp:reminders', { connection });
export const webhookQueue  = new Queue<WebhookJob> ('cp:webhooks',  { connection });
export const reportQueue   = new Queue<ReportJob>  ('cp:reports',   { connection });
```

---

## 4. lib/socket.ts

```typescript
import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { redisSub } from './redis';
import { config } from './config';

export function setupSocket(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    path: '/ws',
    cors: { origin: config.FRONTEND_URL, credentials: true },
  });

  // Autenticação: accessToken no handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) return next(new Error('Não autenticado'));
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { clinicaId, id: userId, papel } = socket.data.user;
    socket.join(`clinica:${clinicaId}`);
    socket.join(`user:${userId}`);
    if (papel === 'MEDICO')   socket.join(`medico:${userId}`);
    if (papel === 'PACIENTE') socket.join(`paciente:${userId}`);
  });

  // Redis pub/sub → reencaminhar para rooms
  redisSub.subscribe('cp:eventos');
  redisSub.on('message', (_ch, msg) => {
    const { room, event, data } = JSON.parse(msg);
    io.to(room).emit(event, data);
  });

  return io;
}
```

---

## 5. lib/eventBus.ts

```typescript
import { redis } from './redis';

export async function publishEvent(room: string, event: string, data: unknown) {
  // Publicar APENAS depois do commit no DB ter sido confirmado
  await redis.publish('cp:eventos', JSON.stringify({ room, event, data }));
}

// Eventos definidos (from @clinicaplus/events):
// 'agendamento:criado'   { agendamentoId, dataHora, pacienteNome }
// 'agendamento:estado'   { agendamentoId, novoEstado, anteriorEstado }
// 'agendamento:triagem'  { agendamentoId }
// 'fatura:emitida'       { faturaId, pacienteId, total }
// 'notificacao'          { tipo, mensagem, link? }
```

---

## 6. middleware/apiKeyAuth.ts

```typescript
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { redis } from '../lib/redis';

export async function apiKeyAuth(req, _res, next) {
  const raw = req.headers['x-api-key'] as string | undefined;
  if (!raw) throw new AppError('API key em falta', 401, 'API_KEY_REQUIRED');

  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  // Rate limit por key (Redis sliding window, 1h)
  const rateLimitKey = `ratelimit:apikey:${hash}`;
  const count = await redis.incr(rateLimitKey);
  if (count === 1) await redis.expire(rateLimitKey, 3600);
  const limit = 500; // por plano — simplificado
  if (count > limit) throw new AppError('Rate limit excedido', 429, 'RATE_LIMIT_EXCEEDED');

  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    include: { clinica: true },
  });

  if (!key || !key.ativo) throw new AppError('API key inválida', 401, 'INVALID_API_KEY');
  if (key.expiresAt && key.expiresAt < new Date()) throw new AppError('API key expirada', 401, 'API_KEY_EXPIRED');

  // Actualizar último uso (fire-and-forget)
  prisma.apiKey.update({ where: { id: key.id }, data: { ultimoUso: new Date() } }).catch(() => {});

  req.user    = { id: `apikey:${key.id}`, clinicaId: key.clinicaId, papel: 'API_KEY', escopos: key.escopos };
  req.clinica = key.clinica;
  req.isApiKey = true;
  next();
}

export function requireScope(scope: string) {
  return (req, _res, next) => {
    if (!req.isApiKey) return next();
    if (!req.user.escopos.includes(scope)) throw new AppError('Scope insuficiente', 403, 'INSUFFICIENT_SCOPE');
    next();
  };
}
```

---

## 7. services/permissao.service.ts

```typescript
import { redis } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';

const CACHE_TTL = 300; // 5 minutos

export const permissaoService = {

  async check(userId: string, recurso: string, accao: string): Promise<boolean> {
    const codigo   = `${recurso}:${accao}`;
    const cacheKey = `perm:${userId}:${codigo}`;

    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached !== null) return cached === '1';

    const user = await prisma.utilizador.findUniqueOrThrow({ where: { id: userId }, select: { papel: true } });

    const roleBase = await prisma.rolePermissao.findUnique({
      where: { papel_permissaoId: { papel: user.papel, permissaoId: codigo } },
    });
    let permitido = !!roleBase;

    const override = await prisma.utilizadorPermissao.findUnique({
      where: { utilizadorId_permissaoId: { utilizadorId: userId, permissaoId: codigo } },
    });
    if (override?.tipo === 'GRANT') permitido = true;
    if (override?.tipo === 'DENY')  permitido = false;

    await redis.setex(cacheKey, CACHE_TTL, permitido ? '1' : '0').catch(() => {});
    return permitido;
  },

  async requirePermission(userId: string, recurso: string, accao: string): Promise<void> {
    const ok = await permissaoService.check(userId, recurso, accao);
    if (!ok) throw new AppError('Sem permissão para esta operação', 403, 'FORBIDDEN');
  },

  async invalidateCache(userId: string): Promise<void> {
    const keys = await redis.keys(`perm:${userId}:*`).catch(() => [] as string[]);
    if (keys.length > 0) await redis.del(...keys).catch(() => {});
  },
};
```

---

## 8. services/planEnforcement.service.ts

```typescript
export const planEnforcementService = {

  async check(clinicaId: string, recurso: 'medicos' | 'consultas' | 'pacientes'): Promise<void> {
    const clinica = await prisma.clinica.findUniqueOrThrow({ where: { id: clinicaId } });
    const limites = await prisma.planoLimite.findUniqueOrThrow({ where: { plano: clinica.plano } });

    if (recurso === 'medicos' && limites.maxMedicos !== -1) {
      const n = await prisma.medico.count({ where: { clinicaId, ativo: true } });
      if (n >= limites.maxMedicos)
        throw new AppError(`Limite do plano ${clinica.plano}: máximo ${limites.maxMedicos} médicos.`, 402, 'PLAN_LIMIT_REACHED');
    }

    if (recurso === 'consultas' && limites.maxConsultasMes !== -1) {
      const inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const n = await prisma.agendamento.count({ where: { clinicaId, criadoEm: { gte: inicio } } });
      if (n >= limites.maxConsultasMes)
        throw new AppError(`Limite mensal de ${limites.maxConsultasMes} consultas atingido.`, 402, 'PLAN_LIMIT_REACHED');
    }
  },

  async canUseFeature(clinicaId: string, feature: 'apiKey' | 'webhook' | 'relatoriosHist' | 'export'): Promise<boolean> {
    const clinica = await prisma.clinica.findUniqueOrThrow({ where: { id: clinicaId } });
    const limites = await prisma.planoLimite.findUniqueOrThrow({ where: { plano: clinica.plano } });
    const map = { apiKey: limites.apiKeyPermitido, webhook: limites.webhookPermitido, relatoriosHist: limites.relatoriosHist, export: limites.exportPermitido };
    return map[feature];
  },
};
```

---

## 9. apps/worker/ — Estrutura

```
apps/worker/
├── package.json          scripts: build, start, dev
├── tsconfig.json
└── src/
    ├── index.ts           registar workers + SIGTERM graceful shutdown
    ├── lib/
    │   ├── redis.ts       cliente ioredis (partilha config com API)
    │   ├── queues.ts      definição das 4 filas (consumer side)
    │   ├── prisma.ts      singleton (igual ao API)
    │   └── logger.ts      Pino JSON
    └── workers/
        ├── email.worker.ts     consome cp:emails → Resend
        ├── reminder.worker.ts  consome cp:reminders → verifica estado → emailQueue
        ├── webhook.worker.ts   consome cp:webhooks → fetch + HMAC + update entrega
        └── report.worker.ts    consome cp:reports → SQL agregado → CSV/JSON
```

### reminder.worker.ts (padrão de todos os workers)

```typescript
import { Worker, type Job } from 'bullmq';
import type { ReminderJob } from '@clinicaplus/events';

export const reminderWorker = new Worker<ReminderJob>(
  'cp:reminders',
  async (job: Job<ReminderJob>) => {
    const log = logger.child({ jobId: job.id, agendamentoId: job.data.agendamentoId });
    log.info('Processing reminder');

    const ag = await prisma.agendamento.findUnique({
      where: { id: job.data.agendamentoId },
      include: { paciente: true, medico: true, clinica: true },
    });

    if (!ag) { log.warn('Agendamento not found — skip'); return; }
    if (['CANCELADO','CONCLUIDO','NAO_COMPARECEU'].includes(ag.estado)) {
      log.info({ estado: ag.estado }, 'Agendamento inactive — skip reminder');
      return;
    }

    await emailQueue.add('reminder-email', {
      to: ag.paciente.email ?? '',
      template: 'reminder',
      data: { pacienteNome: ag.paciente.nome, medicoNome: ag.medico.nome, dataHora: ag.dataHora.toISOString(), tipo: job.data.tipo },
    }, { jobId: `email-reminder-${ag.id}-${job.data.tipo}` });

    await prisma.lembreteAgendamento.updateMany({
      where: { agendamentoId: ag.id, tipo: job.data.tipo },
      data: { enviadoEm: new Date() },
    });

    log.info('Reminder queued successfully');
  },
  { connection: redis, concurrency: 10, attempts: 3, backoff: { type: 'exponential', delay: 3_600_000 } }
);

reminderWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err: err.message }, 'Reminder failed'));
```

---

## 10. Actualizar server.ts

```typescript
// Alterações mínimas ao server.ts existente:

import { createServer } from 'http';
import { setupSocket } from './lib/socket';
import { redis } from './lib/redis';

const app    = express();
// ... middleware chain inalterado ...
const server = createServer(app);
setupSocket(server);

// Adicionar redis status ao /health
app.get('/health', async (_req, res) => {
  const dbOk    = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  const redisOk = await redis.ping().then(r => r === 'PONG').catch(() => false);
  const status  = dbOk && redisOk ? 'ok' : 'degraded';
  res.status(status === 'ok' ? 200 : 207).json({
    status,
    database: dbOk    ? 'connected' : 'disconnected',
    redis:    redisOk ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    version: process.env.npm_package_version,
  });
});

// IMPORTANTE: usar server.listen em vez de app.listen
server.listen(config.PORT, () => logger.info({ port: config.PORT }, 'Server started'));
```
