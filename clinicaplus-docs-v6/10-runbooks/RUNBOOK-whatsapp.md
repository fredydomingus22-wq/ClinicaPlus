# RUNBOOK — WhatsApp, Evolution API & n8n

## Tabela de sintomas → secção

| Sintoma | Causa provável | Secção |
|---------|---------------|--------|
| QR code não aparece no painel | instância não criada ou Evolution API em baixo | §1 |
| WhatsApp desconectou sozinho | sessão Baileys expirou (normal após ~14 dias) | §2 |
| Mensagens recebidas mas fluxo não responde | workflow n8n inactivo ou webhook errado | §3 |
| Automação activada mas paciente não recebe resposta | API key interna inválida no n8n | §4 |
| Lembrete não enviado | job BullMQ falhou ou agendamento sem número WA | §5 |
| n8n em baixo — automações param | failover manual | §6 |

---

## §1 — QR code não aparece

```bash
# 1. Verificar se Evolution API está de pé
curl $EVOLUTION_API_URL/manager/checkConnectionStatus \
  -H "apikey: $EVOLUTION_API_KEY"

# 2. Verificar se instância existe
curl $EVOLUTION_API_URL/instance/fetchInstances \
  -H "apikey: $EVOLUTION_API_KEY"

# 3. Ver logs Railway
railway logs --service evolution-api | tail -50
```

**Se instância não existe:** o admin deve clicar "Conectar WhatsApp" novamente no painel.

**Se Evolution API em baixo:**
```bash
railway restart --service evolution-api
```

---

## §2 — WhatsApp desconectou

Sessão Baileys expira ao fim de ~14 dias sem actividade ou quando o telemóvel
reinicia a sessão. É comportamento normal.

**Reconectar:**
```bash
# Forçar refresh do QR via API interna
curl -X POST $API_URL/api/whatsapp/instancias/reconectar \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

O admin verá o QR code no painel e volta a escanear.

**Automações durante desconexão:**
- Workflows n8n continuam a receber webhooks (vão falhar em silêncio)
- Mensagens ficam em fila na Evolution API por 24h
- Após reconexão, mensagens pendentes são entregues automaticamente

---

## §3 — Fluxo não responde a mensagens

```bash
# 1. Verificar se workflow está activo no n8n
curl $N8N_BASE_URL/api/v1/workflows \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  | jq '.data[] | {name, active}'

# 2. Ver execuções recentes (últimas 10)
curl "$N8N_BASE_URL/api/v1/executions?limit=10" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  | jq '.data[] | {id, status, startedAt}'

# 3. Ver detalhe de execução com erro
curl $N8N_BASE_URL/api/v1/executions/<execution-id> \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

```sql
-- Verificar se webhook path está correcto na DB
SELECT wa.tipo, wa.ativo, wa.n8n_workflow_id, wa.n8n_webhook_path
FROM wa_automacoes wa
JOIN wa_instancias wi ON wi.id = wa.instancia_id
WHERE wi.clinica_id = '<clinicaId>';
```

**Webhook URL errado:** desactivar e reactivar a automação no painel — recria o workflow.

---

## §4 — API key interna inválida no n8n

**Sintoma:** n8n executa workflow mas recebe 401 ao chamar `/api/whatsapp/fluxo/*`

```sql
-- Ver API keys internas do tipo n8n-whatsapp
SELECT id, nome, ativo, ultimo_uso, criado_em
FROM api_keys
WHERE clinica_id = '<clinicaId>'
AND nome LIKE '%n8n%';
```

**Correcção:** desactivar e reactivar a automação — o serviço gera nova API key e actualiza o workflow.

```bash
curl -X POST $API_URL/api/whatsapp/automacoes/<automacaoId>/desactivar \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -X POST $API_URL/api/whatsapp/automacoes/<automacaoId>/activar \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## §5 — Lembrete não enviado

```bash
# Ver jobs falhados na fila wa-lembretes
redis-cli -u $REDIS_URL LRANGE bull:wa-lembretes:failed 0 -1

# Ver logs do worker
railway logs --service worker | grep "wa-lembrete"
```

```sql
-- Agendamentos de amanhã sem número WhatsApp
SELECT a.id, p.nome, p.telefone
FROM agendamentos a
JOIN pacientes p ON p.id = a.paciente_id
WHERE DATE(a.data_hora) = CURRENT_DATE + INTERVAL '1 day'
AND p.telefone NOT LIKE '244%'  -- número não normalizado
AND a.clinica_id = '<clinicaId>';
```

**Reenviar lembrete manualmente:**
```bash
curl -X POST $API_URL/api/superadmin/jobs/wa-lembrete/executar \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -d '{ "agendamentoId": "<id>" }'
```

---

## §6 — n8n em baixo

Quando o n8n está em baixo, as mensagens WhatsApp chegam à Evolution API
mas não há workflow para processar. A Evolution API retentar o webhook até 5x.

**Failover imediato:**
```bash
railway restart --service n8n
railway logs --service n8n | tail -100
```

**Se n8n não recuperar em 30 minutos:**
Activar modo de resposta automática na Evolution API:
```bash
# Enviar mensagem genérica a todos os números que tentaram contactar
# (fazer manualmente via Evolution API ou aguardar recuperação)
```

Após recuperar, os workflows são reactivados automaticamente
(estado persiste no volume Railway do n8n).
