# RUNBOOK — Subscrições e Planos

## Tabela de sintomas → causa → secção

| Sintoma | Causa provável | Secção |
|---------|---------------|--------|
| Clínica PRO bloqueada em funcionalidade PRO | Cache `clinica.plano` dessincronizado | §1 |
| Job de expiração não correu | Worker em baixo ou job com erro | §2 |
| Clínica em GRACE_PERIOD não recebeu email | Fila de notificações bloqueada | §3 |
| Admin vê "plano BASICO" mas pagou PRO | Super Admin não fez upgrade após pagamento | §4 |
| `PLAN_LIMIT_REACHED` inesperado | Limites da tabela `plano_limites` incorrectos | §5 |

---

## §1 — Resincronizar cache de plano

**Sintoma:** clínica tem `clinica.plano = BASICO` mas `subscricao.plano = PRO`

```sql
-- Verificar dessincronização
SELECT c.id, c.nome, c.plano as cache_plano, s.plano as subscricao_plano, s.estado
FROM clinicas c
JOIN subscricoes s ON s.clinica_id = c.id
WHERE s.criado_em = (
  SELECT MAX(criado_em) FROM subscricoes WHERE clinica_id = c.id
)
AND c.plano != s.plano;
```

**Correcção manual:**
```sql
-- Para cada clínica dessincronizada:
UPDATE clinicas
SET plano = 'PRO',
    subscricao_estado = 'ACTIVA',
    subscricao_valida_ate = (
      SELECT valida_ate FROM subscricoes
      WHERE clinica_id = '<clinicaId>'
      ORDER BY criado_em DESC LIMIT 1
    )
WHERE id = '<clinicaId>';
```

**Prevenção:** confirmar que o job de reconciliação nocturno está activo.

---

## §2 — Job de expiração não correu

```bash
# Ver estado da fila no Railway
railway logs --service worker | grep "subscricao-expiracao"

# Via Redis CLI — verificar se job está na fila
redis-cli -u $REDIS_URL LRANGE bull:subscricao-expiracao:delayed 0 -1
redis-cli -u $REDIS_URL LRANGE bull:subscricao-expiracao:failed  0 -1
```

**Forçar execução manual:**
```bash
# Via endpoint interno (apenas em staging/prod com token de super admin)
curl -X POST $API_URL/api/superadmin/jobs/subscricao-expiracao/executar \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
```

**Verificar cron schedule:**
```typescript
// O job deve estar agendado assim no worker:
// agenda.every('0 2 * * *', jobVerificarExpiracoes, { timezone: 'Africa/Luanda' })
// Verifica em apps/worker/src/index.ts
```

---

## §3 — Emails de aviso não enviados

```sql
-- Ver notificações pendentes (enviadoEm = null)
SELECT sn.*, s.clinica_id, s.plano, s.valida_ate
FROM subscricao_notificacoes sn
JOIN subscricoes s ON s.id = sn.subscricao_id
WHERE sn.enviado_em IS NULL
ORDER BY s.valida_ate ASC;
```

```sql
-- Ver notificações com erro
SELECT sn.tipo, sn.erro, s.clinica_id
FROM subscricao_notificacoes sn
JOIN subscricoes s ON s.id = sn.subscricao_id
WHERE sn.erro IS NOT NULL
ORDER BY sn.criado_em DESC
LIMIT 20;
```

**Reenviar manualmente:**
```bash
curl -X POST $API_URL/api/superadmin/notificacoes/reenviar \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -d '{ "subscricaoNotificacaoId": "<id>" }'
```

---

## §4 — Fazer upgrade manual após confirmação de pagamento

Este é o fluxo normal para o Super Admin após receber comprovativo de pagamento:

```bash
# 1. Confirmar ID da clínica
curl $API_URL/api/superadmin/clinicas?search=<nome-clinica> \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"

# 2. Ver subscrição actual
curl $API_URL/api/superadmin/clinicas/<clinicaId>/subscricao \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"

# 3. Fazer upgrade
curl -X POST $API_URL/api/superadmin/clinicas/<clinicaId>/subscricao/upgrade \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plano": "PRO",
    "validaAte": "2027-03-13T00:00:00.000Z",
    "valorKz": 75000,
    "referenciaInterna": "INV-2026-0042",
    "notas": "Pagamento confirmado via transferência BFA ref. 12345"
  }'

# 4. Confirmar que o estado ficou correcto
curl $API_URL/api/superadmin/clinicas/<clinicaId>/subscricao \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
```

---

## §5 — Limites incorrectos em `plano_limites`

```sql
-- Ver limites actuais
SELECT * FROM plano_limites;
```

Valores correctos esperados:
```
plano       | max_medicos | max_consultas_mes | max_pacientes | max_api_keys | api_key | webhooks
BASICO      | 2           | 100               | 500           | 0            | false   | false
PRO         | 10          | -1                | -1            | 3            | true    | true (5)
ENTERPRISE  | -1          | -1                | -1            | -1           | true    | true (-1)
```

**Correcção:**
```bash
# Correr seed idempotente
pnpm --filter=api db:seed:planos
# ou directamente:
npx tsx apps/api/src/seeds/plano-limites.seed.ts
```
