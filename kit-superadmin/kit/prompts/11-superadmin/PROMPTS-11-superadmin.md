# Task: Sprint 11 — Painel Super Admin

## METODOLOGIA: TEST-DRIVEN DEVELOPMENT
Ciclo: RED → GREEN → REFACTOR. Nunca escreves código de produção sem teste a falhar primeiro.

---

## LEITURA OBRIGATÓRIA — confirma antes de avançar

1. `docs/CLAUDE.md`                                                → regras absolutas
2. `docs/01-adr/ADR-015-superadmin-panel.md`                      → decisão arquitectural
3. `docs/11-modules/MODULE-superadmin.md`                          → spec completa
4. `kit/skills/superadmin/SKILL.md`                                → 7 regras absolutas
5. `kit/skills/superadmin/reference/kpis-formulas.md`              → fórmulas MRR, churn, NRR
6. `kit/skills/superadmin/reference/implementation-refs.md`        → impersonation, MFA, TDD, UI
7. `kit/skills/tdd/SKILL.md`                                       → ciclo TDD
8. `docs/05-database/DATABASE_SCHEMA.md`                           → schema actual
9. `docs/06-security/SECURITY.md`                                  → regras de segurança
10. `docs/07-api/API_REFERENCE.md`                                  → padrões de endpoints existentes

Confirma com: "Li os 10 ficheiros. A avançar para Passo 0."

---

## CONTEXTO

O ClinicaPlus é um SaaS multi-tenant para clínicas privadas em Angola. O SUPER_ADMIN já existe no schema mas sem painel dedicado. Este sprint cria o painel completo de gestão da plataforma.

**Stack:** Node.js 20 + Express + Prisma + PostgreSQL (backend) · React 18 + Vite + TanStack Query + Tailwind (frontend)

**Princípios do painel:**
- Dark theme profissional (slate-950 background, emerald accents)
- Toda a actividade do SA auditada em AuditLog
- MFA obrigatório para acesso
- Impersonation com TTL de 30min e audit trail
- Cache Redis em endpoints de dashboard (TTL 5min)

---

## PASSO 0 — Migration + Schema

### 0a. Criar migration_009_superadmin
```bash
pnpm db:migrate --name superadmin_panel
```

Adicionar ao schema Prisma (ver MODULE-superadmin.md secção 2):
- `ImpersonationSession` — sessões de impersonation com TTL e motivo
- `SistemaEvento` — eventos de observabilidade por tenant
- `FeatureFlag` — flags por plano ou por clínica

Adicionar ao model `Clinica`:
- `suspensaEm DateTime?`
- `motivoSuspensao String?`
- `notasInternas String?`

Adicionar ao model `Utilizador`:
- `mfaSecret String?` (encriptado)
- `mfaPending Boolean @default(false)`
- `mfaActivatedAt DateTime?`

### 0b. Seed de Feature Flags
```typescript
// prisma/seeds/feature-flags.ts
await prisma.featureFlag.createMany({
  data: [
    { codigo: 'whatsapp_bot', descricao: 'Bot WhatsApp (clinicaplus-intel)', activoPara: 'PRO', activo: true },
    { codigo: 'ia_noshow',    descricao: 'Predictor de no-show com ML',      activoPara: 'PRO', activo: false },
    { codigo: 'relatorios_avancados', descricao: 'Relatórios PRO',           activoPara: 'PRO', activo: true },
  ],
  skipDuplicates: true,
});
```

---

## PASSO 1 — MFA Service (TDD)

### RED: escrever testes
```typescript
// apps/api/src/services/__tests__/mfa.service.test.ts
// Ver testes em reference/implementation-refs.md
```

### GREEN: implementar `services/mfa.service.ts`

Dependências:
```bash
pnpm add otplib qrcode @types/qrcode --filter=api
```

Funções:
- `setup(userId)` → gera secret + QR code, guarda em DB encriptado
- `verify(userId, token)` → verifica TOTP
- `activate(userId, token)` → activa MFA após verificação

**Encriptação do secret:**
```typescript
import crypto from 'crypto';
const ENCRYPTION_KEY = config.MFA_ENCRYPTION_KEY; // 32 bytes hex
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}
function decrypt(encrypted: string): string {
  const [ivHex, content] = encrypted.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.from(ivHex, 'hex'));
  return decipher.update(content, 'hex', 'utf8') + decipher.final('utf8');
}
```

### PASSO 1b — Modificar login handler para SUPER_ADMIN

Localizar `apps/api/src/routes/auth.ts` → `POST /login`:
1. Após verificar credenciais e antes de emitir JWT:
2. Se `papel === SUPER_ADMIN` E `mfaActivatedAt === null` → retornar `{ requiresMfaSetup: true, setupToken }`
3. Se `papel === SUPER_ADMIN` E `mfaActivatedAt !== null` E `!req.body.mfaToken` → retornar `{ requiresMfa: true }`
4. Se `papel === SUPER_ADMIN` E `mfaToken` presente → verificar TOTP → só então emitir JWT com `expiresIn: '4h'`

---

## PASSO 2 — Rotas e Serviços Backend (TDD)

### 2a. RED: escrever todos os testes de integração
Copiar testes de `reference/implementation-refs.md` → `tests/superadmin.test.ts`.

### 2b. Criar ficheiros
```bash
touch apps/api/src/routes/superadmin.ts
touch apps/api/src/services/superadmin.service.ts
```

### 2c. GREEN: implementar rotas + serviços

**Regra de ouro:** cada rota deve ter:
1. `authenticate` middleware
2. `requireRole(['SUPER_ADMIN'])` middleware — NUNCA tenantMiddleware
3. Comentário `// superadmin: cross-tenant query` nas queries Prisma sem clinicaId
4. `await auditLogService.log(...)` após cada mutação

**Implementar nesta ordem:**

**Grupo 1 — Dashboard:**
```
GET /api/superadmin/dashboard → getDashboardKPIs() com cache Redis TTL 5min
```

**Grupo 2 — Clínicas (CRUD cross-tenant):**
```
GET    /api/superadmin/clinicas           → lista paginada
GET    /api/superadmin/clinicas/:id       → detalhe completo
GET    /api/superadmin/clinicas/:id/stats → métricas (cache 5min)
PATCH  /api/superadmin/clinicas/:id/plano
PATCH  /api/superadmin/clinicas/:id/suspender
PATCH  /api/superadmin/clinicas/:id/reactivar
PATCH  /api/superadmin/clinicas/:id/notas
```

**Grupo 3 — Utilizadores:**
```
GET   /api/superadmin/utilizadores
GET   /api/superadmin/utilizadores/:id
PATCH /api/superadmin/utilizadores/:id/desactivar
```

**Grupo 4 — Impersonation:**
```
POST /api/superadmin/impersonar           → criarImpersonation()
POST /api/superadmin/impersonar/:id/terminar
GET  /api/superadmin/impersonar/historico
```

**Grupo 5 — Observabilidade:**
```
GET /api/superadmin/observabilidade/saude    → scores por clínica (cache 5min)
GET /api/superadmin/observabilidade/eventos  → filtros avançados
```

**Grupo 6 — Financeiro:**
```
GET /api/superadmin/financeiro/mrr     → MRR Bridge (cache 1h)
GET /api/superadmin/financeiro/planos  → distribuição por plano
```

**Grupo 7 — Sistema:**
```
GET   /api/superadmin/sistema/feature-flags
PATCH /api/superadmin/sistema/feature-flags/:codigo
POST  /api/superadmin/sistema/anuncio
```

**Grupo 8 — Audit Log:**
```
GET /api/superadmin/audit-log  → cross-tenant, filtros avançados
```

### 2d. Registar router em server.ts
```typescript
import superAdminRouter from './routes/superadmin';
app.use('/api/superadmin', superAdminRouter);
```

### 2e. Adicionar ao middleware de autenticação
Verificação de token de impersonation (ver reference/implementation-refs.md → MFA Flow).

---

## PASSO 3 — Frontend: Setup e Layout

### 3a. Instalar dependências
```bash
pnpm add otplib qrcode --filter=web
```

### 3b. Criar estrutura de directórios
```bash
mkdir -p apps/web/src/pages/superadmin
mkdir -p apps/web/src/hooks/superadmin
mkdir -p apps/web/src/api/superadmin
```

### 3c. Rotas lazy-loaded no router.tsx
Adicionar grupo `/superadmin/*` com `RequireRole role="SUPER_ADMIN"`.
Todas as páginas como `lazy(() => import(...))`.

### 3d. SuperAdminLayout.tsx
Ver MODULE-superadmin.md secção 5.
- Sidebar escura (slate-950, emerald accents)
- NavItems com badges para alertas
- SessionCountdown (tempo restante do JWT de 4h)
- ImpersonationBanner (visível quando impersonando)

### 3e. Zustand store para estado SA
```typescript
// stores/superadmin.store.ts
interface SuperAdminStore {
  isImpersonating:  boolean
  clinicaNome:      string | null
  expiresAt:        Date | null
  saToken:          string | null
  startImpersonation: (data: ImpersonationData) => void
  endImpersonation:   () => void
}
```

---

## PASSO 4 — Páginas Frontend (por ordem de prioridade)

### 4a. DashboardPage.tsx
Ver MODULE-superadmin.md secção 6.
- KPI Cards (2 linhas × 4 cards)
- Tabela de saúde das clínicas
- Eventos críticos recentes
- MRR Bridge Chart (Recharts BarChart)

### 4b. ClinicasPage.tsx
- Tabela paginada com filtros (plano, estado, search)
- Cada linha: nome, plano, estado, agendamentos30d, receita30d, última actividade, acções
- Acções inline: ver detalhe, alterar plano, suspender

### 4c. ClinicaDetalhePage.tsx
Ver MODULE-superadmin.md secção 7.
- Header com badges e botões de acção
- Stats rápidas (5 cards)
- Tabs: Visão Geral | Utilizadores | Financeiro | Observabilidade | Auditoria | Suporte

### 4d. ObservabilidadePage.tsx
Ver MODULE-superadmin.md secção 10.
- Status da infraestrutura (5 serviços: Railway API, Railway Intel, Supabase, Redis, Evolution API)
- Mapa de saúde (grid de cards verde/amarelo/vermelho)
- Drill-down de eventos ao clicar numa clínica

### 4e. FinanceiroPage.tsx
- MRR Bridge (waterfall chart)
- Tabela de cohorts de retenção
- Distribuição por plano (donut chart simples)

### 4f. SuportePage.tsx (Impersonation UI)
- Lista de clínicas com botão "Entrar como Admin"
- Modal: seleccionar admin + campo motivo obrigatório
- Histórico das últimas sessões de impersonation

### 4g. SistemaPage.tsx
- Toggle switches para feature flags
- Formulário de anúncio global

### 4h. AuditLogPage.tsx
- Tabela com filtros: actor, recurso, acção, clínica, data
- Expansão inline para ver antes/depois

---

## PASSO 5 — MFA UI

### 5a. Página de setup MFA
```
/superadmin/mfa/setup
- Instruções para instalar Google Authenticator
- QR code gerado pelo backend
- Campo de verificação do código de 6 dígitos
- Após confirmar → redireciona para dashboard
```

### 5b. Modificar LoginPage para SUPER_ADMIN
Após login normal:
1. Se `requiresMfaSetup: true` → redirecionar para /superadmin/mfa/setup
2. Se `requiresMfa: true` → mostrar campo TOTP inline (não redirect)

---

## PASSO 6 — Hooks TanStack Query

```typescript
// hooks/superadmin/useDashboard.ts
export function useSuperAdminDashboard() {
  return useQuery({
    queryKey: ['sa', 'dashboard'],
    queryFn:  () => api.get('/api/superadmin/dashboard').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,  // 5min — alinhado com cache Redis
    refetchInterval: 60 * 1000, // refresh a cada 1min
  });
}

// hooks/superadmin/useClinicas.ts
export function useSuperAdminClinicas(filters: ClinicasFilter) {
  return useQuery({
    queryKey: ['sa', 'clinicas', filters],
    queryFn:  () => api.get('/api/superadmin/clinicas', { params: filters }).then(r => r.data.data),
  });
}

// hooks/superadmin/useImpersonar.ts
export function useImpersonar() {
  const setSAStore = useSuperAdminStore(s => s.startImpersonation);
  return useMutation({
    mutationFn: (data: ImpersonarInput) => api.post('/api/superadmin/impersonar', data).then(r => r.data.data),
    onSuccess: (data) => {
      setSAStore({ token: data.token, clinicaNome: data.clinicaNome, expiresAt: new Date(data.expiresAt) });
      // Substituir token no authStore
      useAuthStore.getState().setAccessToken(data.token);
      navigate('/admin/dashboard');
    }
  });
}
```

---

## CHECKLIST FINAL

### Backend
- [ ] `pnpm test --filter=api` — todos os testes passam
- [ ] `pnpm typecheck --filter=api` — zero erros
- [ ] Todos os endpoints superadmin têm `requireRole(['SUPER_ADMIN'])`
- [ ] Nenhum endpoint usa tenantMiddleware
- [ ] Todas as mutações têm auditLogService.log()
- [ ] MFA obrigatório no login de SUPER_ADMIN
- [ ] Token de impersonation não acede a /api/superadmin/
- [ ] Cache Redis activo no dashboard e financeiro

### Frontend
- [ ] `pnpm typecheck --filter=web` — zero erros
- [ ] Rotas /superadmin/* lazy-loaded
- [ ] ImpersonationBanner visível em todas as páginas durante impersonation
- [ ] SessionCountdown activo na sidebar
- [ ] Modal de motivo em suspender + alterar plano + desactivar utilizador
- [ ] MFA setup flow completo e testado
- [ ] Dark theme consistente (não misturar com o tema claro do admin normal)

### Segurança
- [ ] `curl /api/superadmin/dashboard` sem token → 401
- [ ] `curl /api/superadmin/dashboard` com token ADMIN → 403
- [ ] Token de impersonation + `curl /api/superadmin/dashboard` → 403
- [ ] Sessão de SA dura 4h (não 7d)
- [ ] Todas as ImpersonationSessions têm motivo non-empty

---

## Notas importantes

**Dark theme:** O painel SA usa `bg-slate-950` como fundo (diferente do `bg-white` do admin de clínica). Isto é intencional — o SA deve perceber imediatamente que está num contexto diferente.

**Currency:** Mesmo que seja um painel interno, todos os valores monetários são em Kwanza (Kz) inteiros. Usar `formatKwanza()` de `@clinicaplus/utils` — nunca floats.

**Observabilidade:** Os `SistemaEvento` são criados pelo middleware de error handling e pelo reminder.worker. O super admin não cria eventos — apenas os vê.
