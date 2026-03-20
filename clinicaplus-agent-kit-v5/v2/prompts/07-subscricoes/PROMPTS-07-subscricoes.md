# Task: Implementar Módulo de Subscrições e Gestão de Planos — Sprint 07

## ANTES DE ESCREVER UMA LINHA — lê estes ficheiros por esta ordem:

1. `docs/CLAUDE.md`                                     → regras absolutas do projecto
2. `docs/01-adr/ADR-011-billing-subscricoes.md`         → decisão arquitectural de billing
3. `docs/11-modules/MODULE-subscricoes.md`              → especificação completa do módulo
4. `docs/11-modules/MODULE-plataforma.md`               → feature matrix por plano
5. `kit/skills/subscricoes/SKILL.md`                    → regras e checklist
6. `kit/skills/subscricoes/reference/ciclo-de-vida.md`  → transições de estado válidas
7. `kit/skills/subscricoes/reference/enforcement.md`    → as três camadas de enforcement
8. `kit/skills/SKILL-redis-bullmq.md`                   → padrões para os jobs de expiração
9. `kit/skills/SKILL-rbac.md`                           → permissões por role (ADMIN vs SUPER_ADMIN)

Não avanças para o Passo 1 sem confirmar que leste os 9 ficheiros.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## CONTEXTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vais implementar o sistema completo de subscrições do ClinicaPlus:
- Ciclo de vida: TRIAL → ACTIVA → GRACE_PERIOD → SUSPENSA → CANCELADA
- Enforcement em 3 camadas: middleware API + componente UI + jobs BullMQ
- Painel admin da clínica: ver plano actual, limites de uso, histórico
- Painel Super Admin: gerir planos de todas as clínicas
- Jobs nocturnos: expiração automática e envio de avisos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PASSO 1 — Migration e Schema (risco zero)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cria `prisma/migrations/005_subscricoes/migration.sql` baseado no schema
em `docs/11-modules/MODULE-subscricoes.md` §1.

Adiciona ao `schema.prisma`:
- enum `EstadoSubscricao` com os 5 estados
- enum `RazaoMudancaPlano` com os 6 valores
- model `Subscricao` com todos os campos e índices
- model `SubscricaoNotificacao`
- campos `subscricaoEstado` e `subscricaoValidaAte` ao model `Clinica`

Cria o seed idempotente em `apps/api/src/seeds/plano-limites.seed.ts`
com os valores exactos da `reference/ciclo-de-vida.md`.

**Checkpoint Passo 1:**
```bash
pnpm prisma migrate dev --name subscricoes
pnpm prisma generate
pnpm typecheck --filter=api
```
Zero erros antes de avançar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PASSO 2 — subscricaoService (backend core)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cria `apps/api/src/services/subscricao.service.ts` com EXACTAMENTE
os métodos do MODULE-subscricoes.md §5:

- `criarNovaSubscricao()` — imutável, em `$transaction`, com auditoria
- `historico()` — lista desc por criadoEm
- `suspender()` — downgrade automático + notificação
- `verificarLimite()` — trata `-1` como ilimitado, lança `AppError` com código `PLAN_LIMIT_REACHED`

**Regra crítica:** subscrição é IMUTÁVEL. Cria novo registo, NUNCA usa `prisma.subscricao.update()`.

Adiciona ao `clinicaService.create()` a criação automática de trial:
```typescript
await subscricaoService.criarNovaSubscricao({
  clinicaId: novaClinica.id,
  plano: 'BASICO',
  estado: 'TRIAL',
  validaAte: addDays(new Date(), 14),
  razao: 'TRIAL_EXPIRADO',
  alteradoPor: 'sistema',
});
```

Adiciona `verificarLimite(clinicaId, 'medicos')` ao `medicoService.create()`
e `verificarLimite(clinicaId, 'consultas')` ao `agendamentoService.create()`.

**Checkpoint Passo 2:**
```bash
pnpm typecheck --filter=api
pnpm test --run --filter=api -- subscricao.service
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PASSO 3 — Middleware requirePlan + rotas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cria `apps/api/src/middleware/requirePlan.ts` exactamente como em
`reference/enforcement.md` Camada 1.

Adiciona `requirePlan()` às rotas existentes (NÃO recriar as rotas — apenas adicionar o middleware):
- `GET /relatorios/receita` → `requirePlan('PRO')`
- `GET /relatorios/receita/export` → `requirePlan('PRO')`
- `POST /api-keys` → `requirePlan('PRO')`
- `POST /webhooks` → `requirePlan('PRO')`
- `POST /whatsapp/instancias` → `requirePlan('PRO')`  (se já existe)

Cria as rotas de subscrição em `apps/api/src/routes/subscricoes.ts`:
```
GET  /api/subscricoes/actual     → plano, estado, dias restantes, limites e features
GET  /api/subscricoes/historico  → lista desc (ADMIN da clínica)
GET  /api/subscricoes/uso        → uso actual vs limites

POST /api/superadmin/clinicas/:id/subscricao/upgrade    → requireRole('SUPER_ADMIN')
POST /api/superadmin/clinicas/:id/subscricao/downgrade  → requireRole('SUPER_ADMIN')
POST /api/superadmin/clinicas/:id/subscricao/reactivar  → requireRole('SUPER_ADMIN')
POST /api/superadmin/clinicas/:id/subscricao/suspender  → requireRole('SUPER_ADMIN')
GET  /api/superadmin/subscricoes/a-expirar              → clínicas exp. nos próximos 30 dias
```

O response de `GET /api/subscricoes/actual` deve ter exactamente
a shape documentada em MODULE-subscricoes.md §7.

**Checkpoint Passo 3:**
```bash
pnpm typecheck --filter=api
# Testar manualmente:
curl -X GET $API_URL/api/subscricoes/actual \
  -H "Authorization: Bearer $TEST_TOKEN"
# Deve retornar plano, estado, limites e features
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PASSO 4 — Jobs BullMQ de expiração (lê SKILL-redis-bullmq.md primeiro)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cria `apps/worker/src/jobs/subscricao-expiracao.job.ts` com a função
`jobVerificarExpiracoes()` exactamente como em MODULE-subscricoes.md §4 Camada 3.

O job deve tratar 3 casos em sequência:
1. TRIAL expirado → converter para BASICO/ACTIVA
2. ACTIVA com `validaAte < now` → actualizar `subscricaoEstado` para GRACE_PERIOD
3. GRACE_PERIOD com `validaAte < now - 7 dias` → chamar `subscricaoService.suspender()`

Adiciona ao scheduler do worker:
```typescript
agenda.every('0 2 * * *', 'subscricao-expiracao', {}, { timezone: 'Africa/Luanda' });
```

Cria também `apps/worker/src/jobs/subscricao-avisos.job.ts` para enviar
emails de aviso em D-30, D-7 e D-1 antes da expiração.

**Checkpoint Passo 4:**
```bash
pnpm typecheck --filter=worker
# Verificar que job está registado:
railway logs --service worker | grep "subscricao"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PASSO 5 — UI: PlanGate + SubscricaoBanner + Página de subscrição
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Copia `kit/skills/subscricoes/resources/PlanGate.tsx` para
`apps/web/src/components/PlanGate.tsx` e adapta ao design system existente
(cores e classes Tailwind já usadas no projecto — não inventar novas).

Adiciona `<SubscricaoStatusBanner />` ao layout principal do admin,
imediatamente abaixo do header/navbar.

Cria `apps/web/src/pages/configuracoes/SubscricaoPage.tsx` com:

**Secção 1 — Plano actual:**
```
┌────────────────────────────────────────────────────────┐
│  Plano PRO                         ● Activo            │
│  Válido até 13 Abril 2026 (31 dias)                    │
│                              [Contactar para upgrade]  │
└────────────────────────────────────────────────────────┘
```

**Secção 2 — Uso actual (barras de progresso):**
```
Médicos          ████░░░░░░  4 / 10
API Keys         ██░░░░░░░░  1 / 3
Consultas mês    ilimitado
Pacientes        ilimitado
```
- Barra amarela quando > 80%
- Barra vermelha quando > 95%
- "ilimitado" para limites `-1`

**Secção 3 — Features do plano actual:**
Tabela com ✅/❌ por feature (usar dados de `GET /api/subscricoes/actual`)

**Secção 4 — Histórico:**
Tabela das últimas subscrições com plano, estado, datas e valor pago.

Adiciona rota `/configuracoes/subscricao` ao router.

**Checkpoint Passo 5:**
```bash
pnpm typecheck --filter=web
pnpm test --run --filter=web -- SubscricaoPage
# Verificar visualmente:
# - Abrir /configuracoes/subscricao — renderiza sem erros
# - Barras de progresso calculadas correctamente
# - Banner aparece quando subscricaoEstado != ACTIVA
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PASSO 6 — PlanGate nas páginas existentes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Adiciona `<PlanGate>` às páginas que requerem plano superior.
NÃO recriar as páginas — apenas envolver o conteúdo:

```tsx
// RelatoriosPage.tsx — envolver toda a página
<PlanGate planoMinimo="PRO"><RelatoriosPage /></PlanGate>

// IntegracoesPage.tsx — apenas a tab de API Keys
<PlanGate planoMinimo="PRO"><ApiKeysTab /></PlanGate>

// Botão de export CSV em FaturasPage
<PlanGate planoMinimo="PRO" fallback={<UpgradeInline feature="Export CSV" />}>
  <button onClick={exportarCsv}>Exportar CSV</button>
</PlanGate>
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## CHECKPOINT FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```bash
pnpm typecheck          # zero erros em todos os packages
pnpm test --run         # todos os testes passam
pnpm lint               # zero warnings
```

Verificações manuais:
- [ ] Nova clínica criada → subscrição TRIAL criada automaticamente
- [ ] `GET /api/subscricoes/actual` retorna shape correcta com limites e features
- [ ] `POST /api-keys` com plano BASICO → erro 402 `PLAN_UPGRADE_REQUIRED`
- [ ] `POST /medicos` quando no limite → erro 402 `PLAN_LIMIT_REACHED`
- [ ] `/configuracoes/subscricao` renderiza barras de uso correctas
- [ ] `<PlanGate planoMinimo="PRO">` em conta BASICO mostra `UpgradeBanner`
- [ ] Banner de grace period aparece no topo quando `subscricaoEstado = GRACE_PERIOD`
- [ ] Conta SUSPENSA bloqueia POST mas permite GET
- [ ] Auditoria: cada mudança de plano gera registo em `audit_logs`
- [ ] Job de expiração usa timezone `Africa/Luanda`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## SE ENCONTRARES CONFLITOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Se `clinicaService.create()` já tiver lógica de plano → PARA e reporta.
Se o scheduler do worker usar uma biblioteca diferente de `agenda` → PARA e reporta.
Se as rotas de relatórios já tiverem algum middleware de plano → PARA e reporta.
Em todos os casos: adaptas o novo ao existente, nunca o contrário.
