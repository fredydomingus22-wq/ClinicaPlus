# MODULE — Super Admin Panel

**Sprint:** 11
**ADR:** ADR-015
**Rotas frontend:** `/superadmin/*`
**Rotas API:** `/api/superadmin/*`
**Role:** SUPER_ADMIN (exclusivo)

---

## 1. Estrutura de páginas

```
/superadmin/
├── dashboard          ← Vista geral da plataforma (KPIs + alertas)
├── clinicas           ← Lista de todas as clínicas
│   └── :id            ← Detalhe de uma clínica
├── utilizadores       ← Todos os utilizadores cross-tenant
├── subscricoes        ← Gestão de planos e billing
├── observabilidade    ← Saúde por tenant, erros, latência
├── financeiro         ← MRR, ARR, churn, receita da plataforma
├── audit-log          ← Todas as acções administrativas
├── sistema            ← Configurações globais, feature flags
└── suporte            ← Impersonation, debug, reset de contas
```

---

## 2. Schema — migration_009_superadmin

```prisma
// Sessões de impersonation — auditoria e TTL
model ImpersonationSession {
  id              String   @id @default(cuid())
  superAdminId    String   // quem está a impersonar
  targetClinicaId String
  targetAdminId   String
  token           String   @unique  // JWT hash SHA-256
  criadoEm        DateTime @default(now())
  expiresAt       DateTime  // sempre now() + 30min
  terminadaEm     DateTime?
  ip              String
  motivo          String    // obrigatório — para audit

  superAdmin    Utilizador @relation("SuperAdminImpersonations", fields: [superAdminId], references: [id])
  targetAdmin   Utilizador @relation("ImpersonatedSessions", fields: [targetAdminId], references: [id])
  targetClinica Clinica    @relation(fields: [targetClinicaId], references: [id])

  @@index([superAdminId])
  @@index([expiresAt])
  @@map("impersonation_sessions")
}

// Eventos de sistema para observabilidade
model SistemaEvento {
  id         String   @id @default(cuid())
  clinicaId  String?  // null = evento global
  tipo       String   // API_ERROR | SLOW_QUERY | WEBHOOK_FAIL | PAYMENT_FAIL | LOGIN_FAIL | PLAN_LIMIT
  severidade String   // INFO | WARN | ERROR | CRITICAL
  mensagem   String
  metadata   Json?    // { endpoint, latencyMs, statusCode, ... }
  criadoEm  DateTime  @default(now())

  @@index([clinicaId, criadoEm])
  @@index([tipo, severidade, criadoEm])
  @@index([criadoEm])
  @@map("sistema_eventos")
}

// Feature flags por plano ou por clínica específica
model FeatureFlag {
  id          String   @id @default(cuid())
  codigo      String   @unique  // ex: "whatsapp_beta", "ia_noshow"
  descricao   String
  activoPara  String   // "ALL" | "BASICO" | "PRO" | "ENTERPRISE" | "CLINICA_IDS"
  clinicaIds  String[] // se activoPara === "CLINICA_IDS"
  activo      Boolean  @default(false)
  atualizadoEm DateTime @updatedAt

  @@map("feature_flags")
}

// Adicionar ao model Clinica existente:
// suspensaEm   DateTime?   // null = activa
// motivoSuspensao String?
// notasInternas String?   // notas do super admin (não visíveis à clínica)
```

---

## 3. Endpoints API — /api/superadmin/

Todos requerem `papel === SUPER_ADMIN`. Nenhum usa tenantMiddleware.
Todas as acções são auditadas em AuditLog com `actorTipo: "SUPER_ADMIN"`.

### Dashboard

```
GET /api/superadmin/dashboard
→ KPIs da plataforma: totalClinicas, clinicasActivas, totalUtilizadores,
  totalAgendamentos30d, mrr, arr, churnRate, novasClinicas30d, alertasCriticos
  Cache Redis TTL: 5min
```

### Clínicas

```
GET    /api/superadmin/clinicas
       Query: plano, estado (ACTIVA|SUSPENSA|TRIAL), search, page, limit, sortBy
       → lista paginada com stats por clínica (agendamentos, utilizadores, receita, última actividade)

GET    /api/superadmin/clinicas/:id
       → detalhe completo: config, utilizadores, stats, histórico de planos,
         eventos de sistema, últimas impersonations, faturas

GET    /api/superadmin/clinicas/:id/stats
       → métricas detalhadas: agendamentos/dia, taxa de no-show, receita, utilizadores activos
       Cache TTL: 5min

PATCH  /api/superadmin/clinicas/:id/plano
       Body: { plano: "PRO", motivoAlteracao: string }
       → altera plano + regista em HistoricoPlano + email automático à clínica

PATCH  /api/superadmin/clinicas/:id/suspender
       Body: { motivo: string }
       → suspende acesso + notifica admin da clínica

PATCH  /api/superadmin/clinicas/:id/reactivar
       → reactiva clínica suspensa

PATCH  /api/superadmin/clinicas/:id/notas
       Body: { notas: string }
       → notas internas (invisíveis à clínica)
```

### Utilizadores

```
GET    /api/superadmin/utilizadores
       Query: papel, clinicaId, search, page, limit
       → todos os utilizadores cross-tenant

GET    /api/superadmin/utilizadores/:id
       → detalhe: perfil, clínica, últimas sessões, audit log

PATCH  /api/superadmin/utilizadores/:id/desactivar
       Body: { motivo: string }
       → desactiva conta + invalida todos os tokens
```

### Impersonation

```
POST   /api/superadmin/impersonar
       Body: { clinicaId: string, adminId: string, motivo: string }
       → gera token de impersonation (TTL 30min)
       → regista em ImpersonationSession
       → retorna { token, redirectUrl, expiresAt }

POST   /api/superadmin/impersonar/:sessionId/terminar
       → invalida token antes do TTL

GET    /api/superadmin/impersonar/historico
       → últimas 50 sessões de impersonation
```

### Observabilidade

```
GET    /api/superadmin/observabilidade/saude
       → score de saúde por clínica (verde/amarelo/vermelho)
       → baseado em: erros nas últimas 24h, latência p95, falhas de webhook

GET    /api/superadmin/observabilidade/eventos
       Query: clinicaId, tipo, severidade, dataInicio, dataFim, page
       → eventos do sistema filtrados

GET    /api/superadmin/observabilidade/infraestrutura
       → status Railway (API, Worker, Intel), Supabase, Redis, Evolution API
       → latências p50/p95/p99 por serviço
```

### Financeiro (métricas da plataforma)

```
GET    /api/superadmin/financeiro/mrr
       Query: periodo (3m|6m|12m|24m)
       → série histórica de MRR com breakdown: new, expansion, churn, contraction
       Cache TTL: 1h

GET    /api/superadmin/financeiro/cohorts
       → cohort analysis: clínicas por mês de início, retenção por cohort

GET    /api/superadmin/financeiro/planos
       → distribuição de clínicas por plano + receita por plano
```

### Sistema

```
GET    /api/superadmin/sistema/feature-flags
PATCH  /api/superadmin/sistema/feature-flags/:codigo
       Body: { activo: boolean, activoPara?: string, clinicaIds?: string[] }

GET    /api/superadmin/sistema/configuracoes-globais
PATCH  /api/superadmin/sistema/configuracoes-globais

POST   /api/superadmin/sistema/anuncio
       Body: { titulo, mensagem, tipo: "INFO|WARN|MANUTENCAO", expiresAt? }
       → envia anúncio a todos os admins de clínica
```

### Audit Log

```
GET    /api/superadmin/audit-log
       Query: actorId, recurso, accao, clinicaId, dataInicio, dataFim, superAdminOnly, page
       → todos os audit logs cross-tenant
```

---

## 4. Serviços TypeScript

### superadmin.service.ts

```typescript
// apps/api/src/services/superadmin.service.ts

export const superAdminService = {

  // KPIs da plataforma
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    const [clinicas, utilizadores, agendamentos30d, receita30d] = await Promise.all([
      prisma.clinica.count(),
      prisma.utilizador.count({ where: { ativo: true } }),
      prisma.agendamento.count({
        where: { criadoEm: { gte: subDays(new Date(), 30) } }
      }),
      prisma.pagamento.aggregate({
        _sum: { valor: true },
        where: { criadoEm: { gte: subDays(new Date(), 30) } }
      }),
    ]);

    const mrr = await calcularMRR();

    return {
      totalClinicas: clinicas,
      clinicasActivas: await prisma.clinica.count({ where: { suspensaEm: null } }),
      totalUtilizadores: utilizadores,
      totalAgendamentos30d: agendamentos30d,
      receita30d: receita30d._sum.valor ?? 0,
      mrr,
      arr: mrr * 12,
      // ...
    };
  },

  // Calcular MRR a partir de subscriptions activas
  async calcularMRR(): Promise<number> {
    const precosPorPlano: Record<string, number> = {
      BASICO:     2_500_00,  // 25.000 Kz/mês (em centavos Kz)
      PRO:        7_500_00,  // 75.000 Kz/mês
      ENTERPRISE: 20_000_00, // 200.000 Kz/mês
    };
    const clinicas = await prisma.clinica.findMany({
      where: { suspensaEm: null },
      select: { plano: true },
    });
    return clinicas.reduce((sum, c) => sum + (precosPorPlano[c.plano] ?? 0), 0);
  },

  // Score de saúde por clínica
  async calcularSaudeClinicas(): Promise<ClinicaSaude[]> {
    const desde24h = subHours(new Date(), 24);
    const clinicas = await prisma.clinica.findMany({
      where: { suspensaEm: null },
      select: { id: true, nome: true, plano: true },
    });

    return Promise.all(clinicas.map(async (c) => {
      const [erros, webhookFails] = await Promise.all([
        prisma.sistemaEvento.count({
          where: { clinicaId: c.id, severidade: { in: ['ERROR', 'CRITICAL'] }, criadoEm: { gte: desde24h } }
        }),
        prisma.webhookEntrega.count({
          where: {
            webhook: { clinicaId: c.id },
            sucesso: false, criadoEm: { gte: desde24h }
          }
        }),
      ]);

      const score = erros === 0 && webhookFails < 5 ? 'VERDE'
                  : erros < 5 || webhookFails < 20 ? 'AMARELO'
                  : 'VERMELHO';

      return { clinicaId: c.id, nome: c.nome, plano: c.plano, score, erros, webhookFails };
    }));
  },

  // Gerar token de impersonation
  async criarImpersonation(
    superAdminId: string,
    clinicaId: string,
    adminId: string,
    motivo: string,
    ip: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    // Validar que adminId pertence à clinicaId
    const admin = await prisma.utilizador.findFirst({
      where: { id: adminId, clinicaId, papel: 'ADMIN' }
    });
    if (!admin) throw new AppError('Admin não encontrado nesta clínica', 404);

    const expiresAt = addMinutes(new Date(), 30);
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.impersonationSession.create({
      data: { superAdminId, targetClinicaId: clinicaId, targetAdminId: adminId,
              token: tokenHash, expiresAt, ip, motivo }
    });

    // Gerar JWT de impersonation (sem acesso a superadmin routes)
    const jwt = sign(
      { id: adminId, clinicaId, papel: 'ADMIN', impersonatedBy: superAdminId },
      config.JWT_SECRET,
      { expiresIn: '30m' }
    );

    return { token: jwt, expiresAt };
  },
};
```

---

## 5. Frontend — estrutura de páginas React

```
pages/superadmin/
├── SuperAdminLayout.tsx      ← sidebar + header + impersonation banner
├── DashboardPage.tsx         ← KPIs + alertas + actividade recente
├── ClinicasPage.tsx          ← tabela paginada com filtros
├── ClinicaDetalhePage.tsx    ← detalhe completo de uma clínica
├── UtilizadoresPage.tsx      ← todos os utilizadores cross-tenant
├── SubscricoesPage.tsx       ← gestão de planos + histórico
├── ObservabilidadePage.tsx   ← saúde por tenant + infraestrutura
├── FinanceiroPage.tsx        ← MRR bridge + cohorts + ARR
├── AuditLogPage.tsx          ← todas as acções com filtros avançados
├── SistemaPage.tsx           ← feature flags + anúncios + configurações
└── SuportePage.tsx           ← impersonation + debug tools
```

### SuperAdminLayout.tsx

```tsx
// Layout dedicado — sidebar escura, diferente do admin normal
// Visual: fundo slate-900, accents emerald, fonte monospace nos IDs

export function SuperAdminLayout() {
  const { data: alertas } = useQuery({ queryKey: ['sa-alertas'], ... });

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-60 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
            ClinicaPlus
          </span>
          <p className="text-xs text-slate-500 mt-0.5">Super Admin Console</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors
                 ${isActive
                   ? 'bg-emerald-500/10 text-emerald-400'
                   : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`
              }>
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.badge && alertas?.[item.badge] > 0 && (
                <span className="ml-auto text-xs bg-red-500 text-white px-1.5 rounded-full">
                  {alertas[item.badge]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Info do super admin logado */}
        <div className="p-3 border-t border-slate-800">
          <div className="text-xs text-slate-500">Sessão expira em</div>
          <SessionCountdown />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <ImpersonationBanner />
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const NAV_ITEMS = [
  { to: '/superadmin/dashboard',       label: 'Dashboard',        icon: LayoutDashboard, badge: 'alertasCriticos' },
  { to: '/superadmin/clinicas',        label: 'Clínicas',         icon: Building2 },
  { to: '/superadmin/utilizadores',    label: 'Utilizadores',     icon: Users },
  { to: '/superadmin/subscricoes',     label: 'Subscrições',      icon: CreditCard },
  { to: '/superadmin/observabilidade', label: 'Observabilidade',  icon: Activity, badge: 'clinicasVermelho' },
  { to: '/superadmin/financeiro',      label: 'Financeiro',       icon: TrendingUp },
  { to: '/superadmin/audit-log',       label: 'Audit Log',        icon: Shield },
  { to: '/superadmin/sistema',         label: 'Sistema',          icon: Settings },
  { to: '/superadmin/suporte',         label: 'Suporte',          icon: Wrench },
];
```

---

## 6. DashboardPage — KPIs e layout

```tsx
// pages/superadmin/DashboardPage.tsx

export default function DashboardPage() {
  const { data: kpis }    = useSuperAdminDashboard();
  const { data: saude }   = useSaudeClinicas();
  const { data: eventos } = useSistemaEventos({ severidade: ['ERROR','CRITICAL'], limit: 10 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Visão geral da plataforma · Actualizado em tempo real
        </p>
      </div>

      {/* KPI Cards — linha 1: métricas de negócio */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="MRR" value={formatKz(kpis?.mrr)} trend={kpis?.mrrTrend} />
        <KpiCard label="ARR" value={formatKz(kpis?.arr)} />
        <KpiCard label="Clínicas activas" value={kpis?.clinicasActivas} sub={`de ${kpis?.totalClinicas} total`} />
        <KpiCard label="Churn (30d)" value={`${kpis?.churnRate?.toFixed(1)}%`} trend={-kpis?.churnTrend} invertTrend />
      </div>

      {/* KPI Cards — linha 2: operacionais */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Agendamentos (30d)" value={kpis?.agendamentos30d} />
        <KpiCard label="Utilizadores activos" value={kpis?.utilizadoresActivos} />
        <KpiCard label="Novas clínicas (30d)" value={kpis?.novasClinicas30d} />
        <KpiCard label="Consultas via WhatsApp" value={`${kpis?.percentagemWhatsapp?.toFixed(0)}%`} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Saúde das clínicas */}
        <div className="col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Saúde das Clínicas</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {saude?.map(c => (
              <ClinicaSaudeRow key={c.clinicaId} clinica={c} />
            ))}
          </div>
        </div>

        {/* Eventos críticos */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Eventos Recentes</h2>
          <div className="space-y-2">
            {eventos?.items.map(e => (
              <EventoRow key={e.id} evento={e} />
            ))}
          </div>
        </div>
      </div>

      {/* MRR Bridge */}
      <MRRBridgeChart />
    </div>
  );
}

function KpiCard({ label, value, sub, trend, invertTrend }) {
  const trendPositive = invertTrend ? trend < 0 : trend > 0;
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-100 mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      {trend !== undefined && (
        <p className={`text-xs mt-1 font-medium ${trendPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs mês anterior
        </p>
      )}
    </div>
  );
}
```

---

## 7. ClinicaDetalhePage — gestão completa de uma clínica

```tsx
// Tabs: Visão Geral | Utilizadores | Financeiro | Observabilidade | Auditoria | Suporte

export default function ClinicaDetalhePage() {
  const { id } = useParams();
  const { data: clinica } = useSuperAdminClinica(id!);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">{clinica?.nome}</h1>
          <div className="flex items-center gap-2 mt-1">
            <PlanoBadge plano={clinica?.plano} />
            <StatusBadge suspensa={!!clinica?.suspensaEm} />
            <span className="text-xs font-mono text-slate-500">{clinica?.id}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <AlterarPlanoButton clinicaId={id!} planoActual={clinica?.plano} />
          {clinica?.suspensaEm
            ? <ReactivarButton clinicaId={id!} />
            : <SuspenderButton clinicaId={id!} />
          }
          <ImpersonarButton clinicaId={id!} admins={clinica?.admins} />
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Médicos" value={clinica?.stats.totalMedicos} />
        <StatCard label="Pacientes" value={clinica?.stats.totalPacientes} />
        <StatCard label="Consultas (30d)" value={clinica?.stats.agendamentos30d} />
        <StatCard label="Receita (30d)" value={formatKz(clinica?.stats.receita30d)} />
        <StatCard label="Taxa no-show" value={`${clinica?.stats.taxaNoShow?.toFixed(1)}%`} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="utilizadores">Utilizadores</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="observabilidade">Observabilidade</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          <TabsTrigger value="suporte">Suporte</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ClinicaOverviewTab clinica={clinica} />
        </TabsContent>
        {/* ... restantes tabs */}
      </Tabs>
    </div>
  );
}
```

---

## 8. FinanceiroPage — MRR Bridge

```tsx
// MRR Bridge: visualização tipo waterfall
// Starting MRR + New + Expansion - Contraction - Churn = Ending MRR

function MRRBridgeChart({ data }: { data: MRRBridge[] }) {
  // Recharts BarChart com barras stacked
  // Colunas: Starting | New (verde) | Expansion (azul) | Contraction (laranja) | Churn (vermelho) | Ending
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h2 className="text-sm font-medium text-slate-300 mb-4">MRR Bridge</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis tickFormatter={v => formatKzAbrev(v)} tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip
            formatter={(value, name) => [formatKz(value as number), LABELS[name as string]]}
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }}
          />
          <Bar dataKey="starting"    fill="#334155" radius={[2,2,0,0]} />
          <Bar dataKey="new"         fill="#10b981" radius={[2,2,0,0]} />
          <Bar dataKey="expansion"   fill="#3b82f6" radius={[2,2,0,0]} />
          <Bar dataKey="contraction" fill="#f97316" radius={[2,2,0,0]} />
          <Bar dataKey="churn"       fill="#ef4444" radius={[2,2,0,0]} />
          <Bar dataKey="ending"      fill="#6366f1" radius={[2,2,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 9. ImpersonationBanner — sempre visível durante impersonation

```tsx
// Mostrar quando há token de impersonation activo
// Cookie: cp_impersonation_active=1 (definido pelo backend)

function ImpersonationBanner() {
  const isImpersonating = useImpersonationStore(s => s.isActive);
  const clinicaNome     = useImpersonationStore(s => s.clinicaNome);
  const expiresAt       = useImpersonationStore(s => s.expiresAt);

  if (!isImpersonating) return null;

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4" />
        A agir como admin de <strong>{clinicaNome}</strong>
        · Sessão expira em <ImpersonationCountdown expiresAt={expiresAt} />
      </div>
      <button
        onClick={() => terminarImpersonation()}
        className="text-xs font-semibold underline hover:no-underline"
      >
        Terminar sessão
      </button>
    </div>
  );
}
```

---

## 10. ObservabilidadePage

```tsx
// Mapa de calor de saúde das clínicas
// Cada clínica = card com score (VERDE/AMARELO/VERMELHO)
// Clique → drill down com eventos das últimas 24h

export default function ObservabilidadePage() {
  const { data: saude }  = useSaudeClinicas();
  const { data: infra }  = useInfrastructuraStatus();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Status da infraestrutura */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-medium text-slate-300 mb-3">Infraestrutura</h2>
        <div className="grid grid-cols-5 gap-3">
          {INFRA_SERVICES.map(svc => (
            <InfraCard
              key={svc.id}
              nome={svc.nome}
              status={infra?.[svc.id]?.status}
              latencia={infra?.[svc.id]?.latencia}
            />
          ))}
        </div>
      </div>

      {/* Mapa de saúde */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-300">Saúde das Clínicas</h2>
          <div className="flex gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Verde: {saude?.filter(c=>c.score==='VERDE').length}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Amarelo: {saude?.filter(c=>c.score==='AMARELO').length}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Vermelho: {saude?.filter(c=>c.score==='VERMELHO').length}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {saude?.map(c => (
            <ClinicaSaudeCard
              key={c.clinicaId}
              clinica={c}
              selected={selected === c.clinicaId}
              onClick={() => setSelected(c.clinicaId === selected ? null : c.clinicaId)}
            />
          ))}
        </div>
      </div>

      {/* Drill down */}
      {selected && <ClinicaEventosDrillDown clinicaId={selected} />}
    </div>
  );
}
```

---

## 11. MFA para Super Admin

```typescript
// apps/api/src/services/mfa.service.ts

import { authenticator } from 'otplib';
import qrcode from 'qrcode';

export const mfaService = {
  async setup(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const secret  = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(userId, 'ClinicaPlus SuperAdmin', secret);
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    // Guardar secret encriptado no DB (campo mfaSecret em Utilizador)
    await prisma.utilizador.update({
      where: { id: userId },
      data: { mfaSecret: encrypt(secret), mfaPending: true }
    });

    return { secret, qrCodeUrl };
  },

  async verify(userId: string, token: string): Promise<boolean> {
    const user = await prisma.utilizador.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret) return false;
    const secret = decrypt(user.mfaSecret);
    return authenticator.verify({ token, secret });
  },

  async activate(userId: string, token: string): Promise<void> {
    const valid = await mfaService.verify(userId, token);
    if (!valid) throw new AppError('Código MFA inválido', 400, 'INVALID_MFA');
    await prisma.utilizador.update({
      where: { id: userId },
      data: { mfaPending: false, mfaActivatedAt: new Date() }
    });
  },
};

// Adicionar ao flow de login para SUPER_ADMIN:
// 1. Login normal → verificar credenciais
// 2. Se papel === SUPER_ADMIN E mfaActivatedAt !== null → pedir TOTP
// 3. Se papel === SUPER_ADMIN E mfaActivatedAt === null → forçar setup MFA
// 4. Só emitir JWT completo após MFA validado
```

---

## 12. Checklist de verificação

### Backend
- [ ] Todos os endpoints `/api/superadmin/*` têm `requireRole(['SUPER_ADMIN'])`
- [ ] Nenhum endpoint de superadmin usa tenantMiddleware
- [ ] Todas as acções registadas em AuditLog com `actorTipo: "SUPER_ADMIN"`
- [ ] Token de impersonation sem acesso a rotas superadmin
- [ ] MFA obrigatório no login de SUPER_ADMIN
- [ ] Sessão de SA expira em 4h (não 7d)
- [ ] Cache Redis activo nos endpoints de dashboard (TTL 5min) e financeiro (TTL 1h)

### Frontend
- [ ] Rotas `/superadmin/*` lazy-loaded — só carregam para SUPER_ADMIN
- [ ] ImpersonationBanner visível em todas as páginas durante impersonation
- [ ] SessionCountdown visível na sidebar
- [ ] Todas as acções destrutivas têm modal de confirmação com campo "motivo"
- [ ] AuditLog acessível a partir de qualquer detalhe de clínica ou utilizador
- [ ] Dark theme consistente em todo o painel

### Segurança
- [ ] `/superadmin/*` router protegido por `requireRole(['SUPER_ADMIN'])`
- [ ] Token de impersonation tem TTL máximo de 30min sem renovação
- [ ] Todas as sessões de impersonation registadas com IP e motivo
- [ ] MFA activado obrigatoriamente antes do primeiro acesso
- [ ] Testes de penetração básicos: verificar que token de impersonation não tem acesso a superadmin routes
