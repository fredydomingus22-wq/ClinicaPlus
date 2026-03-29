# Reference: Impersonation Flow

## Fluxo completo (SA → Clínica)

```
1. SA acede a /superadmin/clinicas/:id → clica "Entrar como Admin"
2. Modal: seleccionar qual admin + campo motivo (min 10 chars)
3. POST /api/superadmin/impersonar
   Body: { clinicaId, adminId, motivo }
   → API valida: adminId pertence a clinicaId E papel === ADMIN
   → API gera JWT com { impersonatedBy: saId, clinicaId, papel: ADMIN, exp: now+30min }
   → API cria ImpersonationSession na DB
   → API retorna { token, redirectUrl: "/admin/dashboard", expiresAt }
4. Frontend guarda token no Zustand (substituindo o token SA)
   Guarda também { isImpersonating: true, clinicaNome, expiresAt, saToken }
5. Frontend redireciona para /admin/dashboard com novo token
6. ImpersonationBanner aparece em todas as páginas
7. Após 30min: token expira → frontend detecta 401 → redireciona para /superadmin
8. SA pode terminar manualmente: POST /api/superadmin/impersonar/:sessionId/terminar
   → Frontend restaura saToken do Zustand
   → Redireciona de volta para a clínica no painel SA
```

## Segurança crítica

```typescript
// middleware/authenticate.ts — adicionar verificação
if (decoded.impersonatedBy) {
  // Token de impersonation — verificar que não acede a rotas SA
  if (req.path.startsWith('/api/superadmin')) {
    throw new AppError('Acesso negado durante impersonation', 403, 'IMPERSONATION_SCOPE');
  }
  // Verificar que a sessão ainda está activa na DB
  const session = await prisma.impersonationSession.findFirst({
    where: {
      targetAdminId: decoded.id,
      terminadaEm: null,
      expiresAt: { gte: new Date() },
    }
  });
  if (!session) throw new AppError('Sessão de impersonation expirada', 401, 'SESSION_EXPIRED');
}
```

---

# Reference: MFA Flow (TOTP)

## Setup inicial (forçado no 1º login de SUPER_ADMIN)

```
1. SA faz login → API detecta mfaActivatedAt === null
2. API retorna { requiresMfaSetup: true, setupToken: "<token de setup>" }
3. Frontend mostra página de setup MFA
4. Frontend chama GET /api/superadmin/mfa/setup (com setupToken)
5. API gera secret + QR code → retorna { qrCodeUrl, secret }
6. Utilizador escaneia QR code com Google Authenticator
7. Utilizador introduz código de 6 dígitos
8. Frontend chama POST /api/superadmin/mfa/activar { codigo: "123456" }
9. API verifica código → activa MFA → emite JWT completo
```

## Login normal com MFA activo

```
1. SA submete email + password
2. API valida credenciais → detecta papel === SUPER_ADMIN E mfaActivatedAt !== null
3. API retorna { requiresMfa: true } (sem JWT)
4. Frontend mostra campo de código TOTP
5. SA submete código de 6 dígitos
6. POST /api/auth/login { email, password, mfaToken: "123456" }
7. API verifica TOTP → emite JWT com TTL de 4h
```

---

# Reference: TDD Specs — superadmin

```typescript
// tests/superadmin.test.ts

describe('SuperAdmin — Autenticação', () => {
  test('login sem MFA retorna requiresMfa=true para SUPER_ADMIN', async () => {
    const sa = await createTestSuperAdmin({ mfaActivatedAt: new Date() });
    const res = await api.post('/api/auth/login', { email: sa.email, password: 'senha' });
    expect(res.status).toBe(200);
    expect(res.body.requiresMfa).toBe(true);
    expect(res.body.data?.accessToken).toBeUndefined();
  });

  test('login sem MFA setup retorna requiresMfaSetup=true', async () => {
    const sa = await createTestSuperAdmin({ mfaActivatedAt: null });
    const res = await api.post('/api/auth/login', { email: sa.email, password: 'senha' });
    expect(res.body.requiresMfaSetup).toBe(true);
  });

  test('JWT de SA expira em 4h (não 7d)', async () => {
    const token = await loginSuperAdmin();
    const decoded = jwt.decode(token) as any;
    const ttlHoras = (decoded.exp - decoded.iat) / 3600;
    expect(ttlHoras).toBeCloseTo(4, 0);
  });
});

describe('SuperAdmin — Rotas protegidas', () => {
  test('admin de clínica não pode aceder /api/superadmin/', async () => {
    const token = await loginAdmin();
    const res = await api.get('/api/superadmin/dashboard').auth(token, { type: 'bearer' });
    expect(res.status).toBe(403);
  });

  test('token de impersonation não pode aceder /api/superadmin/', async () => {
    const impToken = await criarTokenImpersonation();
    const res = await api.get('/api/superadmin/dashboard').auth(impToken, { type: 'bearer' });
    expect(res.status).toBe(403);
  });

  test('dashboard KPIs cacheados — segunda chamada não faz query à DB', async () => {
    const saToken = await loginSuperAdmin();
    const spy = jest.spyOn(prisma.clinica, 'count');
    await api.get('/api/superadmin/dashboard').auth(saToken, { type: 'bearer' });
    await api.get('/api/superadmin/dashboard').auth(saToken, { type: 'bearer' });
    expect(spy).toHaveBeenCalledTimes(1); // segunda chamada usa cache
  });
});

describe('SuperAdmin — Clínicas', () => {
  test('listar clínicas cross-tenant', async () => {
    const saToken = await loginSuperAdmin();
    await createTestClinica({ nome: 'Clínica A' });
    await createTestClinica({ nome: 'Clínica B' });
    const res = await api.get('/api/superadmin/clinicas').auth(saToken, { type: 'bearer' });
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
  });

  test('alterar plano regista em AuditLog', async () => {
    const saToken = await loginSuperAdmin();
    const clinica = await createTestClinica({ plano: 'BASICO' });
    await api.patch(`/api/superadmin/clinicas/${clinica.id}/plano`)
      .auth(saToken, { type: 'bearer' })
      .send({ plano: 'PRO', motivoAlteracao: 'Pedido do cliente por email' });
    const log = await prisma.auditLog.findFirst({
      where: { recursoId: clinica.id, accao: 'UPDATE', recurso: 'clinica' }
    });
    expect(log).toBeTruthy();
    expect(log?.metadata).toMatchObject({ superAdminAccao: true });
  });

  test('suspender clínica sem motivo retorna 400', async () => {
    const saToken = await loginSuperAdmin();
    const clinica = await createTestClinica();
    const res = await api.patch(`/api/superadmin/clinicas/${clinica.id}/suspender`)
      .auth(saToken, { type: 'bearer' })
      .send({});  // sem motivo
    expect(res.status).toBe(400);
  });
});

describe('SuperAdmin — Impersonation', () => {
  test('criar sessão de impersonation', async () => {
    const saToken = await loginSuperAdmin();
    const clinica = await createTestClinica();
    const admin   = await createTestAdmin({ clinicaId: clinica.id });
    const res = await api.post('/api/superadmin/impersonar')
      .auth(saToken, { type: 'bearer' })
      .send({ clinicaId: clinica.id, adminId: admin.id, motivo: 'Diagnóstico de erro reportado pelo cliente' });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.expiresAt).toBeDefined();
    // Verificar que sessão foi criada na DB
    const session = await prisma.impersonationSession.findFirst({
      where: { targetAdminId: admin.id }
    });
    expect(session).toBeTruthy();
    expect(session?.motivo).toBe('Diagnóstico de erro reportado pelo cliente');
  });

  test('token de impersonation expira após 30min', async () => {
    const { token } = await criarTokenImpersonation();
    const decoded   = jwt.decode(token) as any;
    const ttlMin    = (decoded.exp - decoded.iat) / 60;
    expect(ttlMin).toBeCloseTo(30, 0);
  });

  test('impersonar admin de outra clínica falha', async () => {
    const saToken = await loginSuperAdmin();
    const clinicaA = await createTestClinica();
    const clinicaB = await createTestClinica();
    const adminB   = await createTestAdmin({ clinicaId: clinicaB.id });
    const res = await api.post('/api/superadmin/impersonar')
      .auth(saToken, { type: 'bearer' })
      .send({ clinicaId: clinicaA.id, adminId: adminB.id, motivo: 'Teste de segurança' });
    expect(res.status).toBe(404); // adminB não pertence a clinicaA
  });
});

describe('SuperAdmin — Observabilidade', () => {
  test('score VERMELHO com 10+ erros nas últimas 24h', async () => {
    const clinica = await createTestClinica();
    // Criar 10 eventos de erro
    await Promise.all(Array.from({ length: 10 }, () =>
      prisma.sistemaEvento.create({
        data: { clinicaId: clinica.id, tipo: 'API_ERROR', severidade: 'ERROR', mensagem: 'test error' }
      })
    ));
    const saToken = await loginSuperAdmin();
    const res = await api.get('/api/superadmin/observabilidade/saude').auth(saToken, { type: 'bearer' });
    const clinicaScore = res.body.data.find(c => c.clinicaId === clinica.id);
    expect(clinicaScore?.score).toBe('VERMELHO');
  });
});
```

---

# Reference: UI Components

## KpiCard

```tsx
// Usado no DashboardPage
interface KpiCardProps {
  label: string
  value: string | number | undefined
  sub?: string
  trend?: number      // positivo = cresceu, negativo = diminuiu
  invertTrend?: boolean // para churn: vermelho se subiu
}

function KpiCard({ label, value, sub, trend, invertTrend }: KpiCardProps) {
  const trendPositive = invertTrend ? (trend ?? 0) < 0 : (trend ?? 0) > 0;
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold text-slate-100 mt-1.5 tabular-nums">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      {trend !== undefined && (
        <p className={`text-xs mt-1.5 font-semibold flex items-center gap-0.5
          ${trendPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}% vs mês anterior
        </p>
      )}
    </div>
  );
}
```

## ClinicaSaudeCard

```tsx
const SCORE_COLORS = {
  VERDE:    { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  AMARELO:  { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-500'   },
  VERMELHO: { bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'bg-red-500'     },
};

function ClinicaSaudeCard({ clinica, selected, onClick }) {
  const colors = SCORE_COLORS[clinica.score];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all
        ${selected ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-300 truncate">{clinica.nome}</span>
        <span className={`flex items-center gap-1 text-[10px] font-semibold ${colors.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} animate-pulse`} />
          {clinica.score}
        </span>
      </div>
      <div className="flex gap-3 text-[10px] text-slate-500">
        <span>{clinica.plano}</span>
        {clinica.erros > 0 && <span className="text-red-400">{clinica.erros} erros</span>}
      </div>
    </button>
  );
}
```

## AlterarPlanoModal

```tsx
// Confirmar alteração de plano com campo de motivo obrigatório
function AlterarPlanoModal({ clinicaId, planoActual, onClose }) {
  const form    = useForm({ resolver: zodResolver(AlterarPlanoSchema) });
  const mutate  = useAlterarPlano();

  return (
    <Modal title="Alterar Plano" onClose={onClose}>
      <form onSubmit={form.handleSubmit(data => mutate.mutate({ clinicaId, ...data }))}>
        <FormField label="Novo plano">
          <select {...form.register('plano')} className={inputClass()}>
            {['BASICO','PRO','ENTERPRISE'].filter(p => p !== planoActual).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Motivo da alteração (mín. 10 caracteres)">
          <textarea
            {...form.register('motivoAlteracao')}
            rows={3}
            className={inputClass()}
            placeholder="Ex: Pedido do cliente via email de 25/03/2026..."
          />
          {form.formState.errors.motivoAlteracao && (
            <p className="text-xs text-red-400 mt-1">{form.formState.errors.motivoAlteracao.message}</p>
          )}
        </FormField>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={mutate.isPending}>Confirmar Alteração</Button>
        </div>
      </form>
    </Modal>
  );
}
```
