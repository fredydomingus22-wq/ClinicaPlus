---
name: superadmin
description: >
  Usa esta skill SEMPRE que tocares em qualquer ficheiro do módulo Super Admin:
  routes/superadmin.ts, services/superadmin.service.ts, services/mfa.service.ts,
  pages/superadmin/*, hooks/useSuperAdmin*.ts, migration_009.
  Inclui TDD obrigatório.
references:
  - reference/kpis-formulas.md
  - reference/impersonation-flow.md
  - reference/observabilidade-schema.md
  - reference/mfa-flow.md
  - reference/tdd-specs.md
  - reference/ui-components.md
related_skills:
  - tdd/SKILL.md
  - rbac/SKILL.md
---

## Quando usar esta skill

- Implementar qualquer endpoint em `apps/api/src/routes/superadmin.ts`
- Implementar qualquer serviço em `services/superadmin.service.ts`
- Criar ou editar páginas em `pages/superadmin/`
- Implementar MFA para contas SUPER_ADMIN
- Implementar impersonation flow
- Criar migration_009

## Quando NÃO usar

- Alterar páginas de admin de clínica (usar skills existentes)
- Alterar o schema de autenticação geral (usar skill auth)
- Criar componentes partilhados em `packages/ui` (usar skill frontend)

---

## Regras absolutas — nunca violar

### 1. SUPER_ADMIN nunca usa tenantMiddleware
```typescript
// CORRECTO — skip tenant middleware explícito
router.get('/clinicas', authenticate, requireRole(['SUPER_ADMIN']), async (req, res) => {
  // req.clinica NÃO EXISTE aqui — não tentar aceder
  const clinicas = await prisma.clinica.findMany(); // cross-tenant OK com comentário
  // superadmin: cross-tenant query intencional
});

// ERRADO — tenantMiddleware injectaria clinicaId errado
router.get('/clinicas', authenticate, tenantMiddleware, requireRole(['SUPER_ADMIN']), ...)
```

### 2. Todas as acções auditadas
```typescript
// CORRECTO — toda a acção do SA no AuditLog
await auditLogService.log({
  clinicaId:  clinicaId ?? null,
  actorId:    req.user.id,
  actorTipo:  'SUPER_ADMIN',
  accao:      'UPDATE',
  recurso:    'clinica',
  recursoId:  clinicaId,
  antes:      estadoAnterior,
  depois:     estadoNovo,
  ip:         req.ip,
  metadata:   { superAdminAccao: true },
});

// ERRADO — acção sem audit trail
await prisma.clinica.update({ ... });
// sem log
```

### 3. Token de impersonation sem acesso a rotas superadmin
```typescript
// No middleware de autenticação:
if (req.user.impersonatedBy && req.path.startsWith('/api/superadmin')) {
  throw new AppError('Token de impersonation sem acesso a superadmin routes', 403);
}
```

### 4. MFA obrigatório antes de emitir JWT completo
```typescript
// No login handler:
if (user.papel === 'SUPER_ADMIN') {
  if (!user.mfaActivatedAt) {
    // Forçar setup — retornar token especial de setup apenas
    return res.status(200).json({
      requiresMfaSetup: true,
      setupToken: generateSetupToken(user.id),
    });
  }
  // Pedir TOTP antes de emitir JWT normal
  if (!req.body.mfaToken) {
    return res.status(200).json({ requiresMfa: true });
  }
  const valid = await mfaService.verify(user.id, req.body.mfaToken);
  if (!valid) throw new AppError('Código MFA inválido', 400, 'INVALID_MFA');
}
// Só aqui emitir JWT completo
```

### 5. Motivo obrigatório em acções destrutivas
```typescript
// Suspender, alterar plano, desactivar utilizador, impersonar:
// SEMPRE exigir campo "motivo" no body e guardá-lo no AuditLog

const { clinicaId, motivo } = SuspenderClinicaSchema.parse(req.body);
// SuspenderClinicaSchema: z.object({ motivo: z.string().min(10).max(500) })
```

### 6. Cache Redis em endpoints de dashboard
```typescript
// CORRECTO — cache 5min para dados que mudam raramente
const cacheKey = 'sa:dashboard:kpis';
const cached = await redis.get(cacheKey);
if (cached) return res.json(JSON.parse(cached));
const kpis = await superAdminService.getDashboardKPIs();
await redis.setex(cacheKey, 300, JSON.stringify(kpis));
return res.json(kpis);

// ERRADO — query à DB em cada request de dashboard
const kpis = await superAdminService.getDashboardKPIs();
return res.json(kpis);
```

### 7. Lazy loading obrigatório nas rotas superadmin
```typescript
// apps/web/src/router.tsx
// CORRECTO — só carrega o bundle superadmin para SUPER_ADMIN
{
  path: 'superadmin/*',
  element: <RequireRole role="SUPER_ADMIN" />,
  children: [
    {
      element: lazy(() => import('./pages/superadmin/SuperAdminLayout')),
      children: [
        { path: 'dashboard', element: lazy(() => import('./pages/superadmin/DashboardPage')) },
        // ...
      ]
    }
  ]
}
```

---

## Fórmulas de KPIs obrigatórias

```typescript
// MRR = soma dos preços dos planos activos (em Kz)
const MRR = clinicasActivas.reduce((sum, c) => sum + PRECO_PLANO[c.plano], 0);

// ARR = MRR × 12
const ARR = MRR * 12;

// Churn Rate (logo churn) = clínicas que cancelaram no mês / clínicas no início do mês
const churnRate = (clinicasCanceladas / clinicasInicioMes) * 100;

// NRR (Net Revenue Retention) = (MRR final - novo MRR) / MRR inicial × 100
// NRR > 100% = expansion > churn (sinal de saúde excelente)
const NRR = ((MRRfinal - MRRnovo) / MRRinicio) * 100;

// ARPU = MRR / clínicas activas
const ARPU = MRR / clinicasActivas;
```

---

## Sub-skills disponíveis

- `reference/kpis-formulas.md` — todas as fórmulas com exemplos
- `reference/impersonation-flow.md` — fluxo completo de impersonation
- `reference/observabilidade-schema.md` — schema de eventos e scores
- `reference/mfa-flow.md` — setup e verificação TOTP
- `reference/tdd-specs.md` — 30+ casos de teste
- `reference/ui-components.md` — componentes do painel (KpiCard, SaudeCard, MRRBridge)
