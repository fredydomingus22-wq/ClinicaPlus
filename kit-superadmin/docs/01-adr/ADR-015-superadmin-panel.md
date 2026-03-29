# ADR-015 — Painel Super Admin: Arquitectura e Funcionalidades

**Data:** 2026-03-27
**Status:** ACEITE
**Decisores:** ClinicaPlus Core Team

---

## Contexto

O SUPER_ADMIN já existe no schema (enum Papel) e a architecture já prevê que skips tenantMiddleware. No entanto, não existe nenhum painel dedicado — o super admin usa a mesma UI das clínicas sem visibilidade cross-tenant, sem métricas de plataforma, sem ferramentas de suporte.

Com N clínicas em produção, o super admin precisa de:
1. Visibilidade total da plataforma em tempo real
2. Gestão do ciclo de vida de clínicas (onboarding, planos, suspensão)
3. Observabilidade por tenant (saúde, erros, usage)
4. Métricas de negócio (MRR, churn, ARR)
5. Ferramentas de suporte (impersonation, reset, debug)
6. Audit trail completo de todas as acções administrativas

---

## Decisões

### D1 — Localização: rota dedicada `/superadmin/*` na mesma SPA

O painel vive dentro de `apps/web` como um grupo de rotas lazy-loaded. Não é uma app separada. Partilha o mesmo design system e autenticação.

**Motivo:** uma app separada duplicaria infra, deploy, e manutenção. As rotas `/superadmin/*` já existem no router.tsx. O bundle só é carregado para utilizadores SUPER_ADMIN (lazy loading por role).

### D2 — Autenticação: JWT com claim papel=SUPER_ADMIN + MFA obrigatório

O login do super admin usa o mesmo endpoint `/api/auth/login` mas:
- Verificação de `papel === SUPER_ADMIN` após login
- MFA obrigatório (TOTP via Google Authenticator)
- Sessão máxima de 4h (vs 7d dos admins de clínica)
- IP allowlist configurável (opcional, default off)
- Todas as acções logadas no AuditLog com campo `superAdminAccao: true`

### D3 — Impersonation: token temporário de 30 minutos

O super admin pode entrar numa clínica como o seu admin para diagnóstico. Implementação:

```
1. SA clica "Entrar como admin" numa clínica
2. API gera token de impersonation (JWT separado, TTL 30min, campo impersonatedBy)
3. Frontend recebe token + URL da clínica
4. SA é redirecionado para /admin com o token de impersonation
5. Toda a actividade é logada com { actorId: saId, impersonating: adminId, clinicaId }
6. Banner persistente "A agir como [clínica] — Terminar sessão"
7. Token não pode ser renovado — expira obrigatoriamente aos 30min
```

**Segurança:** o token de impersonation não tem acesso a `/api/superadmin/*` — isola completamente os poderes.

### D4 — Observabilidade: métricas calculadas na DB, sem serviço externo

Para a fase actual (< 100 clínicas), as métricas são calculadas com SQL aggregations directamente no PostgreSQL via Prisma. Não é necessário um data warehouse externo.

Métricas em cache Redis (TTL 5min para dashboard, TTL 1h para KPIs de negócio).

### D5 — Sem acesso directo à DB pelo frontend

Todas as queries passam por `/api/superadmin/*`. Zero SQL directo no browser. O backend valida `papel === SUPER_ADMIN` antes de qualquer query cross-tenant.

---

## Consequências

**Ganhos:**
- Visibilidade completa da plataforma sem acesso directo à DB
- Suporte a clínicas sem partilhar credenciais
- Métricas de negócio para decisões de produto e pricing
- Audit trail completo de todas as acções administrativas

**Custos:**
- migration_009 com tabelas de métricas e sessões de impersonation
- ~15 novos endpoints em `/api/superadmin/`
- ~10 novas páginas React em `/superadmin/`
- MFA setup para contas SUPER_ADMIN existentes
