# Runbook — Super Admin Panel

## Diagnóstico rápido

| Sintoma | Causa provável | Secção |
|---------|---------------|--------|
| SA não consegue fazer login | MFA não configurado ou código expirado | 1 |
| Dashboard sem dados | Cache Redis em falha | 2 |
| Impersonation não funciona | Token de impersonation expirado ou sessão terminada | 3 |
| Clínica aparece com score VERMELHO incorrectamente | Eventos de erro a acumular sem ser limpos | 4 |
| MRR/ARR incorrectos | Tabela HistoricoPlano desactualizada ou preços errados | 5 |

---

## 1. Login MFA com problemas

```bash
# SA com "Código MFA inválido" mesmo com código correcto:
# Verificar drift de relógio (TOTP é sensível a ±30s)
# O servidor deve estar sincronizado com NTP

# Railway não tem acesso directo ao relógio mas o TOTP tem janela de tolerância
# Verificar em otplib:
authenticator.options = { window: 1 }  // permite ±30s de tolerância

# SA perdeu acesso ao autenticador (telemóvel perdido):
# Só possível através de acesso directo à DB (emergência)
# Via Supabase Dashboard → Table Editor → utilizadores
# Definir mfaSecret = null E mfaActivatedAt = null
# SA fará novo setup MFA no próximo login

# Sessão SA expirou antes do tempo:
# Verificar JWT_SECRET não foi rotacionado
# Verificar relógio do servidor Railway
```

---

## 2. Dashboard sem dados / KPIs a zero

```bash
# Verificar cache Redis
redis-cli -u "$REDIS_URL" --tls
GET "sa:dashboard:kpis"  # deve ter JSON
# Se vazio → cache não foi preenchido ou Redis está down

# Forçar refresh do cache (apagar key)
DEL "sa:dashboard:kpis"
# Na próxima chamada ao dashboard, a key é recriada

# Verificar se há clínicas no DB
# Via Supabase Dashboard → SQL Editor:
SELECT COUNT(*), plano FROM clinicas GROUP BY plano;
```

---

## 3. Impersonation com problemas

```bash
# "Sessão de impersonation expirada" ao tentar aceder ao painel:
# A sessão de 30min expirou — normal
# SA deve criar nova sessão

# Token de impersonation não aceite:
# Verificar que o JWT_SECRET não foi alterado
# Token gerado com secret antigo não funciona com novo

# ImpersonationBanner não aparece no frontend:
# Verificar Zustand store — isImpersonating deve ser true
# Verificar se o token foi substituído correctamente no authStore
# Hard refresh da página pode resolver estado inconsistente

# Ver histórico de todas as sessões de impersonation:
# GET /api/superadmin/impersonar/historico
# Ou via Supabase:
SELECT sa.email as super_admin, c.nome as clinica, i.motivo, i.criado_em, i.expires_at, i.terminada_em
FROM impersonation_sessions i
JOIN utilizadores sa ON sa.id = i.super_admin_id
JOIN clinicas c ON c.id = i.target_clinica_id
ORDER BY i.criado_em DESC
LIMIT 20;
```

---

## 4. Score VERMELHO incorrectos na observabilidade

```bash
# Ver eventos de erro de uma clínica específica
SELECT tipo, severidade, mensagem, criado_em
FROM sistema_eventos
WHERE clinica_id = 'cli-xxx'
  AND severidade IN ('ERROR', 'CRITICAL')
  AND criado_em > NOW() - INTERVAL '24 hours'
ORDER BY criado_em DESC;

# Limpar eventos antigos que estão a inflar o score (>30 dias)
DELETE FROM sistema_eventos
WHERE criado_em < NOW() - INTERVAL '30 days';

# Se os erros são legítimos, verificar o runbook do módulo afectado:
# - API errors → RUNBOOK da API
# - Webhook fails → RUNBOOK-intel.md ou RUNBOOK-whatsapp.md
```

---

## 5. MRR/ARR incorrectos

```bash
# Verificar distribuição actual de planos:
SELECT plano, COUNT(*) as total, COUNT(*) FILTER (WHERE suspensa_em IS NULL) as activas
FROM clinicas
GROUP BY plano;

# Verificar preços configurados no código:
# apps/api/src/services/superadmin.service.ts → const PRECO
# Se os preços mudaram, actualizar e fazer novo deploy

# Verificar tabela HistoricoPlano para upgrades/downgrades:
SELECT tipo, plan_anterior, plan_novo, COUNT(*) as total, DATE_TRUNC('month', criado_em) as mes
FROM historico_plano
WHERE criado_em > NOW() - INTERVAL '6 months'
GROUP BY tipo, plan_anterior, plan_novo, mes
ORDER BY mes DESC;

# Se clínicas TRIAL estão a contar no MRR:
# TRIAL deve ser tratado como MRR = 0 no cálculo
# Verificar que TRIAL não está mapeado em const PRECO
```

---

## 6. Criar primeiro Super Admin

```bash
# Via seed ou directamente no Prisma Studio:
# 1. Criar utilizador com papel = SUPER_ADMIN
# 2. No login, o sistema vai forçar setup MFA
# 3. SA configura TOTP e fica com acesso completo

# Via seed (desenvolvimento):
# prisma/seeds/superadmin.ts
await prisma.utilizador.upsert({
  where: { email: 'superadmin@clinicaplus.ao' },
  update: {},
  create: {
    email:   'superadmin@clinicaplus.ao',
    nome:    'Super Admin ClinicaPlus',
    papel:   'SUPER_ADMIN',
    ativo:   true,
    senha:   await hash('SenhaSuperSegura2026!', 12),
    // NÃO definir clinicaId — SUPER_ADMIN é cross-tenant
  },
});

# NUNCA commitar senhas reais para o Git
```

---

## 7. Suspender clínica em emergência

```bash
# Via API (com token SA e MFA activo):
curl -X PATCH "https://api.clinicaplus.ao/api/superadmin/clinicas/CLI-ID/suspender" \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "motivo": "Actividade suspeita detectada — investigação em curso" }'

# Via Supabase (emergência sem API disponível):
UPDATE clinicas
SET suspensa_em = NOW(), motivo_suspensao = 'Emergência — actividade suspeita'
WHERE id = 'CLI-ID';

# Após suspensão:
# - Admin da clínica vê mensagem de conta suspensa no login
# - Pacientes não conseguem marcar via WhatsApp
# - Dados preservados (suspensão não apaga nada)
```
