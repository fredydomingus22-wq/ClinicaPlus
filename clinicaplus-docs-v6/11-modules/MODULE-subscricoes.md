# MODULE — Subscrições e Gestão de Planos

> Fonte de verdade: este ficheiro + ADR-011
> Lê também: MODULE-plataforma.md (limites por plano), MODULE-rbac.md (permissões)

---

## 1. Modelo de dados completo

```prisma
// ─── migration_005_subscricoes ───────────────────────────────────────────────

// Estados possíveis de uma subscrição
enum EstadoSubscricao {
  TRIAL          // período experimental (14 dias por defeito)
  ACTIVA         // paga e dentro da validade
  GRACE_PERIOD   // expirou há menos de 7 dias — funcional com aviso
  SUSPENSA       // expirou há mais de 7 dias — só leitura
  CANCELADA      // cancelada pelo admin ou pelo cliente
}

// Razões de mudança de plano — para auditoria
enum RazaoMudancaPlano {
  UPGRADE_MANUAL      // Super Admin fez upgrade após confirmação de pagamento
  DOWNGRADE_MANUAL    // Super Admin fez downgrade a pedido
  DOWNGRADE_AUTO      // sistema fez downgrade por expiração (job nocturno)
  TRIAL_EXPIRADO      // trial converteu para BASICO
  REACTIVACAO         // clínica voltou a pagar após suspensão
  CORRECAO            // correcção de erro administrativo
}

model Subscricao {
  id          String   @id @default(cuid())
  clinicaId   String
  clinica     Clinica  @relation(fields: [clinicaId], references: [id])

  plano       Plano                // BASICO | PRO | ENTERPRISE
  estado      EstadoSubscricao     @default(TRIAL)

  // Datas de validade
  inicioEm    DateTime             // quando esta subscrição começou
  validaAte   DateTime             // data de expiração (null = não expira — ENTERPRISE vitalício)
  trialAte    DateTime?            // só preenchido se estado = TRIAL

  // Billing
  valorKz     Int?                 // valor pago em Kwanzas (null se gratuito/trial)
  referenciaInterna String?        // ex: "INV-2026-0042" — referência da invoice gerada

  // Histórico de mudança
  razao       RazaoMudancaPlano
  planoAnterior Plano?             // null na primeira subscrição
  alteradoPor String               // userId do Super Admin ou "sistema"
  notas       String?              // notas internas do Super Admin

  criadoEm    DateTime @default(now())

  @@index([clinicaId, estado])
  @@index([clinicaId, criadoEm(sort: Desc)])
  @@index([validaAte])             // para o job nocturno de expiração
  @@map("subscricoes")
}

// Notificações de renovação agendadas
model SubscricaoNotificacao {
  id           String   @id @default(cuid())
  subscricaoId String
  subscricao   Subscricao @relation(fields: [subscricaoId], references: [id])

  tipo         String   // "AVISO_30D" | "AVISO_7D" | "AVISO_1D" | "EXPIROU" | "GRACE_END"
  enviadoEm    DateTime?
  erro         String?

  @@unique([subscricaoId, tipo])
  @@map("subscricao_notificacoes")
}
```

**Alteração na tabela `Clinica` existente:**
```prisma
// Adicionar à model Clinica:
  subscricoes          Subscricao[]
  subscricaoEstado     EstadoSubscricao @default(TRIAL)  // cache — fonte de verdade é Subscricao
  subscricaoValidaAte  DateTime?                          // cache — para queries rápidas
```

---

## 2. Ciclo de vida completo

```
NOVA CLÍNICA
     │
     ▼
  [TRIAL] ─── 14 dias ───► automático no fim do trial
     │                              │
     │ Super Admin confirma         ▼
     │ pagamento               [BASICO] ◄── downgrade automático se não pagar
     │
     ▼
  [ACTIVA] ◄─────────────────────────────────────────────────────┐
     │                                                            │
     │ validaAte passa                                            │ reactivacao
     ▼                                                            │
[GRACE_PERIOD] ── dia 8+ ──► [SUSPENSA] ── se pagar ────────────┘
     │                           │
     │                           │ dia 30+ (opcional, decisão de negócio)
     │                           ▼
     │                       [CANCELADA]
     │
     │ cancelamento a pedido
     ▼
 [CANCELADA]
```

**Regras:**
- Uma clínica só tem **uma** `Subscricao` activa por vez (estado != CANCELADA)
- Cada mudança cria um novo registo — nunca editar `Subscricao` existente (imutável)
- O campo `clinica.plano` e `clinica.subscricaoEstado` são actualizados em transacção com a nova `Subscricao`

---

## 3. Feature matrix por plano — fonte de verdade

| Feature | BASICO | PRO | ENTERPRISE |
|---------|--------|-----|------------|
| Médicos | 2 | 10 | ilimitado |
| Consultas/mês | 100 | ilimitado | ilimitado |
| Pacientes | 500 | ilimitado | ilimitado |
| API keys | ❌ | ✅ (3) | ✅ (ilimitado) |
| Webhooks | ❌ | ✅ (5) | ✅ (ilimitado) |
| Relatórios histórico | mês corrente | 12 meses | ilimitado |
| Export CSV | ❌ | ✅ | ✅ |
| Multi-localização | ❌ | ❌ | ✅ |
| **WhatsApp automações** | ❌ | ✅ (1 instância) | ✅ (ilimitado) |
| **Suporte prioritário** | email 48h | email 24h | dedicado |
| **SLA uptime** | best-effort | 99.5% | 99.9% |
| Audit log retenção | 30 dias | 1 ano | 2 anos |
| Backup diário | ❌ | ✅ | ✅ |

---

## 4. Enforcement em três camadas

### Camada 1 — Middleware de API

```typescript
// apps/api/src/middleware/requirePlan.ts

import { AppError } from '../lib/AppError';
import type { Plano } from '@prisma/client';

const PLAN_ORDER: Record<Plano, number> = { BASICO: 0, PRO: 1, ENTERPRISE: 2 };

export function requirePlan(minimo: Plano) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const planoClinica = req.clinica.plano;
    const estado = req.clinica.subscricaoEstado;

    // Suspensa: só leitura (GET) — bloquear tudo o resto
    if (estado === 'SUSPENSA' && req.method !== 'GET') {
      throw new AppError(
        'Subscrição suspensa. Renova o teu plano para continuar.',
        402,
        'SUBSCRIPTION_SUSPENDED'
      );
    }

    if (PLAN_ORDER[planoClinica] < PLAN_ORDER[minimo]) {
      throw new AppError(
        `Esta funcionalidade requer plano ${minimo} ou superior.`,
        402,
        'PLAN_UPGRADE_REQUIRED',
        { planoActual: planoClinica, planoNecessario: minimo }
      );
    }

    next();
  };
}

// Uso nas rotas:
// router.get('/relatorios/receita', authenticate, requirePlan('PRO'), handler);
// router.post('/api-keys', authenticate, requirePlan('PRO'), handler);
// router.post('/whatsapp/instancias', authenticate, requirePlan('PRO'), handler);
```

### Camada 2 — UI (React)

```typescript
// apps/web/src/components/PlanGate.tsx

interface PlanGateProps {
  planoMinimo: 'PRO' | 'ENTERPRISE';
  children: React.ReactNode;
  // fallback customizado (senão mostra o UpgradeBanner padrão)
  fallback?: React.ReactNode;
}

const PLAN_ORDER = { BASICO: 0, PRO: 1, ENTERPRISE: 2 };

export function PlanGate({ planoMinimo, children, fallback }: PlanGateProps) {
  const { clinica } = useAuthStore();

  const temAcesso = PLAN_ORDER[clinica.plano] >= PLAN_ORDER[planoMinimo];
  const suspensa  = clinica.subscricaoEstado === 'SUSPENSA';

  if (suspensa) return <SubscricaoSuspensaBanner />;
  if (!temAcesso) return fallback ?? <UpgradeBanner planoNecessario={planoMinimo} />;

  return <>{children}</>;
}

// Uso nos componentes:
// <PlanGate planoMinimo="PRO">
//   <RelatoriosPage />
// </PlanGate>
```

```typescript
// apps/web/src/components/SubscricaoBanner.tsx
// Banner persistente no topo do painel quando em grace period ou trial a acabar

export function SubscricaoBanner() {
  const { clinica } = useAuthStore();
  const { estado, subscricaoValidaAte } = clinica;

  if (estado === 'ACTIVA') return null;

  const diasRestantes = subscricaoValidaAte
    ? differenceInDays(new Date(subscricaoValidaAte), new Date())
    : null;

  if (estado === 'TRIAL' && diasRestantes !== null && diasRestantes <= 7) {
    return (
      <Banner tipo="aviso">
        O teu trial termina em <strong>{diasRestantes} dias</strong>.{' '}
        <a href="/configuracoes/subscricao">Escolhe um plano</a> para continuar.
      </Banner>
    );
  }

  if (estado === 'GRACE_PERIOD') {
    return (
      <Banner tipo="erro">
        A tua subscrição expirou. Tens <strong>{diasRestantes} dias</strong> para renovar
        antes de perder acesso.{' '}
        <a href="/configuracoes/subscricao">Renovar agora</a>
      </Banner>
    );
  }

  if (estado === 'SUSPENSA') {
    return (
      <Banner tipo="bloqueio">
        Conta suspensa. Apenas leitura disponível.{' '}
        <a href="/configuracoes/subscricao">Reactivar conta</a>
      </Banner>
    );
  }

  return null;
}
```

### Camada 3 — Jobs BullMQ

```typescript
// apps/worker/src/jobs/subscricao-expiracao.job.ts
// Corre todos os dias à 02:00 Africa/Luanda

export async function jobVerificarExpiracoes() {
  const agora = new Date();

  // 1. TRIAL expirado → downgrade para BASICO
  const trialsExpirados = await prisma.clinica.findMany({
    where: {
      subscricaoEstado: 'TRIAL',
      subscricaoValidaAte: { lt: agora },
    },
  });

  for (const clinica of trialsExpirados) {
    await subscricaoService.criarNovaSubscricao({
      clinicaId: clinica.id,
      plano: 'BASICO',
      estado: 'ACTIVA',
      razao: 'TRIAL_EXPIRADO',
      alteradoPor: 'sistema',
    });
  }

  // 2. ACTIVA expirada → GRACE_PERIOD
  const activasExpiradas = await prisma.clinica.findMany({
    where: {
      subscricaoEstado: 'ACTIVA',
      subscricaoValidaAte: { lt: agora },
    },
  });

  for (const clinica of activasExpiradas) {
    await prisma.clinica.update({
      where: { id: clinica.id },
      data: { subscricaoEstado: 'GRACE_PERIOD' },
    });
    await notificacaoService.enviarEmailGracePeriod(clinica);
  }

  // 3. GRACE_PERIOD há mais de 7 dias → SUSPENSA + downgrade BASICO
  const graceExpirados = await prisma.clinica.findMany({
    where: {
      subscricaoEstado: 'GRACE_PERIOD',
      subscricaoValidaAte: { lt: subDays(agora, 7) },
    },
  });

  for (const clinica of graceExpirados) {
    await subscricaoService.suspender(clinica.id);
  }
}

// Agendar no worker:
// agenda.every('0 2 * * *', jobVerificarExpiracoes, { timezone: 'Africa/Luanda' });
```

---

## 5. O serviço de subscrições

```typescript
// apps/api/src/services/subscricao.service.ts

export const subscricaoService = {

  // Criar nova subscrição (imutável — não editar registos antigos)
  async criarNovaSubscricao(input: {
    clinicaId: string;
    plano: Plano;
    estado: EstadoSubscricao;
    validaAte?: Date;
    valorKz?: number;
    referenciaInterna?: string;
    razao: RazaoMudancaPlano;
    alteradoPor: string;
    notas?: string;
  }) {
    const clinica = await prisma.clinica.findUniqueOrThrow({ where: { id: input.clinicaId } });

    return prisma.$transaction(async (tx) => {
      // 1. Criar novo registo imutável
      const subscricao = await tx.subscricao.create({
        data: {
          clinicaId: input.clinicaId,
          plano:     input.plano,
          estado:    input.estado,
          inicioEm:  new Date(),
          validaAte: input.validaAte ?? addMonths(new Date(), 1),
          valorKz:   input.valorKz,
          referenciaInterna: input.referenciaInterna,
          razao:     input.razao,
          planoAnterior: clinica.plano,
          alteradoPor: input.alteradoPor,
          notas:     input.notas,
        },
      });

      // 2. Actualizar cache na clínica (transacção atómica)
      await tx.clinica.update({
        where: { id: input.clinicaId },
        data: {
          plano:               input.plano,
          subscricaoEstado:    input.estado,
          subscricaoValidaAte: subscricao.validaAte,
        },
      });

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          clinicaId:   input.clinicaId,
          utilizadorId: input.alteradoPor,
          accao:       'SUBSCRICAO_ALTERADA',
          recurso:     'subscricao',
          recursoId:   subscricao.id,
          dados: {
            planoAnterior: clinica.plano,
            planoNovo:     input.plano,
            razao:         input.razao,
          },
        },
      });

      return subscricao;
    });
  },

  // Histórico de uma clínica
  async historico(clinicaId: string) {
    return prisma.subscricao.findMany({
      where: { clinicaId },
      orderBy: { criadoEm: 'desc' },
    });
  },

  // Suspender clínica (downgrade automático)
  async suspender(clinicaId: string) {
    await this.criarNovaSubscricao({
      clinicaId,
      plano:   'BASICO',
      estado:  'SUSPENSA',
      razao:   'DOWNGRADE_AUTO',
      alteradoPor: 'sistema',
      notas:   'Suspensão automática por falta de pagamento após grace period',
    });
    // Notificar admin da clínica
    await notificacaoService.enviarEmailContaSuspensa(clinicaId);
  },

  // Verificar limites antes de operações críticas
  async verificarLimite(clinicaId: string, recurso: 'medicos' | 'consultas' | 'pacientes' | 'apikeys') {
    const clinica = await prisma.clinica.findUniqueOrThrow({
      where: { id: clinicaId },
      include: { planoLimites: true },
    });

    const limites = await prisma.planoLimite.findUniqueOrThrow({ where: { plano: clinica.plano } });

    const contagens = {
      medicos:    () => prisma.medico.count({ where: { clinicaId, ativo: true } }),
      consultas:  () => prisma.agendamento.count({
        where: { clinicaId, dataHora: { gte: startOfMonth(new Date()) } }
      }),
      pacientes:  () => prisma.paciente.count({ where: { clinicaId } }),
      apikeys:    () => prisma.apiKey.count({ where: { clinicaId, ativo: true } }),
    };

    const limiteCampo = {
      medicos:   'maxMedicos',
      consultas: 'maxConsultasMes',
      pacientes: 'maxPacientes',
      apikeys:   'maxApiKeys',
    } as const;

    const limite = limites[limiteCampo[recurso]] as number;
    if (limite === -1) return; // ilimitado

    const actual = await contagens[recurso]();
    if (actual >= limite) {
      throw new AppError(
        `Limite do plano ${clinica.plano}: máximo ${limite} ${recurso}.`,
        402,
        'PLAN_LIMIT_REACHED',
        { recurso, limite, actual, plano: clinica.plano }
      );
    }
  },
};
```

---

## 6. Endpoints da API

```
# Leitura (ADMIN da clínica)
GET  /api/subscricoes/actual          → plano activo, estado, dias restantes, limites
GET  /api/subscricoes/historico       → lista de todas as subscrições passadas
GET  /api/subscricoes/uso             → uso actual vs limites (médicos, consultas, pacientes)

# Gestão (apenas SUPER_ADMIN do ClinicaPlus)
GET  /api/superadmin/clinicas/:id/subscricao          → estado actual
POST /api/superadmin/clinicas/:id/subscricao/upgrade  → upgrade manual após pagamento
POST /api/superadmin/clinicas/:id/subscricao/downgrade
POST /api/superadmin/clinicas/:id/subscricao/reactivar
POST /api/superadmin/clinicas/:id/subscricao/suspender
GET  /api/superadmin/subscricoes/a-expirar            → clínicas a expirar nos próximos 30 dias
```

---

## 7. Resposta GET /api/subscricoes/actual

```json
{
  "data": {
    "plano": "PRO",
    "estado": "ACTIVA",
    "validaAte": "2026-04-13T00:00:00.000Z",
    "diasRestantes": 31,
    "emGracePeriod": false,
    "limites": {
      "medicos":    { "maximo": 10,  "actual": 4,   "percentagem": 40 },
      "consultas":  { "maximo": -1,  "actual": 347, "percentagem": null },
      "pacientes":  { "maximo": -1,  "actual": 891, "percentagem": null },
      "apiKeys":    { "maximo": 3,   "actual": 1,   "percentagem": 33 }
    },
    "features": {
      "exportCsv":          true,
      "webhooks":           true,
      "whatsappAutomacoes": true,
      "relatoriosHistorico": "12_MESES",
      "multiLocalizacao":   false
    }
  }
}
```
