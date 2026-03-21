# RUNBOOK — WhatsApp, Evolution API & n8n

## Tabela de diagnóstico rápido

| Sintoma observado | Causa mais provável | Secção |
|-------------------|---------------------|--------|
| QR code não aparece no painel | Evolution API em baixo ou instância não criada | §1 |
| QR code aparece mas não conecta | Sessão expirou ou conflito de sessão | §2 |
| WhatsApp desconectou sozinho | Sessão Baileys expirou (~14 dias) | §3 |
| Paciente enviou mensagem mas não recebeu resposta | Workflow n8n inactivo ou webhook errado | §4 |
| Automação activada mas 401 nas chamadas fluxo/* | API key interna inválida ou expirada | §5 |
| Lembretes não enviados | Job BullMQ falhou ou paciente sem número | §6 |
| n8n em baixo | Failover manual | §7 |
| Conversa ficou presa numa etapa | Contexto corrompido ou resetar manualmente | §8 |

---

## §1 — QR code não aparece

```bash
# 1. Verificar se Evolution API responde
curl -s $EVOLUTION_API_URL/manager/checkConnectionStatus \
  -H "apikey: $EVOLUTION_API_KEY" | jq .

# 2. Listar instâncias existentes
curl -s $EVOLUTION_API_URL/instance/fetchInstances \
  -H "apikey: $EVOLUTION_API_KEY" | jq '.[] | {name: .instance.instanceName, state: .instance.state}'

# 3. Ver logs Railway
railway logs --service evolution-api | tail -50
```

**Se Evolution API não responde:**
```bash
railway restart --service evolution-api
# Aguardar 30s e testar novamente
```

**Se instância não existe na Evolution API mas existe na DB:**
```sql
-- Verificar estado na DB
SELECT id, evolution_name, estado, qr_code_base64 IS NOT NULL as has_qr
FROM wa_instancias WHERE clinica_id = '<clinicaId>';
```
Solução: desligar e criar nova instância no painel.

---

## §2 — QR code aparece mas não conecta após scan

Causas comuns:
1. QR expirou (60s) — clicar "Actualizar QR" no painel
2. Número já tem sessão activa noutro dispositivo — fazer logout no telemóvel primeiro
3. Número banido temporariamente pela Meta

```bash
# Forçar geração de novo QR
curl -s $EVOLUTION_API_URL/instance/connect/<evolutionName> \
  -H "apikey: $EVOLUTION_API_KEY" | jq .base64
```

---

## §3 — WhatsApp desconectou sozinho

Sessão Baileys expira ao fim de ~14 dias sem actividade intensa, ou quando o número faz logout no telemóvel.

**Verificar estado:**
```bash
curl -s $EVOLUTION_API_URL/instance/connectionState/<evolutionName> \
  -H "apikey: $EVOLUTION_API_KEY" | jq .instance.state
```

**Reconectar:** o admin abre o painel → "Reconectar" → escaneia novo QR.

**Durante a desconexão:**
- Mensagens chegam à Evolution API mas falham em silêncio no n8n
- Não há perda de dados na DB — conversas ficam em AGUARDA_INPUT
- Após reconexão, novas mensagens são processadas normalmente

---

## §4 — Paciente enviou mensagem mas não recebeu resposta

**Passo 1: Verificar se o webhook chegou à Evolution API**
```bash
# Ver últimas mensagens recebidas na instância
curl -s "$EVOLUTION_API_URL/message/findAll/<evolutionName>?limit=5" \
  -H "apikey: $EVOLUTION_API_KEY" | jq '.[] | {from: .key.remoteJid, msg: .message.conversation}'
```

**Passo 2: Verificar se o n8n recebeu o webhook**
```bash
# Ver execuções recentes do workflow
curl -s "$N8N_BASE_URL/api/v1/executions?limit=10&status=error" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data[] | {id, status, startedAt}'
```

**Passo 3: Verificar se o workflow está activo**
```bash
curl -s "$N8N_BASE_URL/api/v1/workflows?active=true" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data[] | {name, active}'
```

**Passo 4: Verificar webhook path na DB**
```sql
SELECT tipo, ativo, n8n_workflow_id, n8n_webhook_path
FROM wa_automacoes wa
JOIN wa_instancias wi ON wi.id = wa.instancia_id
WHERE wi.clinica_id = '<clinicaId>';
```

**Correcção:** desactivar e reactivar a automação no painel — recria o workflow com config fresca.

---

## §5 — 401 nas chamadas /fluxo/* pelo n8n

**Sintoma:** execução n8n mostra `401 INVALID_API_KEY` no nó HTTP.

**Diagnóstico:**
```sql
-- Ver API keys internas da clínica
SELECT id, nome, ativo, ultimo_uso, expires_at
FROM api_keys
WHERE clinica_id = '<clinicaId>'
AND nome LIKE 'n8n-wa-%'
ORDER BY criado_em DESC;
```

**Correcção:** desactivar e reactivar a automação — o serviço gera nova API key e recria o workflow com o novo token.

---

## §6 — Lembretes não enviados

**Verificar fila BullMQ:**
```bash
redis-cli -u $REDIS_URL LRANGE bull:wa-lembretes:failed 0 -1

# Ver detalhes do job falhado
redis-cli -u $REDIS_URL HGETALL "bull:wa-lembretes:N"
```

**Verificar agendamentos sem número:**
```sql
SELECT a.id, p.nome, p.telefone, a.data_hora
FROM agendamentos a
JOIN pacientes p ON p.id = a.paciente_id
WHERE DATE(a.data_hora) = CURRENT_DATE + INTERVAL '1 day'
AND (p.telefone IS NULL OR p.telefone = '')
AND a.clinica_id = '<clinicaId>';
```

**Reenviar lembrete manualmente:**
```bash
curl -X POST $API_URL/api/superadmin/jobs/wa-lembrete/executar \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "agendamentoId": "<id>", "tipo": "24H" }'
```

---

## §7 — n8n em baixo

**Recovery imediato:**
```bash
railway restart --service n8n
railway logs --service n8n | tail -100
```

**Se n8n não recupera em 30 minutos:**
O estado dos workflows persiste no volume Railway do n8n — após recovery, os workflows estão activos automaticamente.

**Mensagens perdidas durante o downtime:**
A Evolution API tenta entregar webhooks 3x com intervalo de 30s. Se o n8n ainda estiver em baixo, as mensagens são perdidas (o paciente não recebe resposta). Solução manual: o admin responde pelo telemóvel enquanto o bot está em baixo.

---

## §8 — Conversa presa numa etapa

```sql
-- Ver estado actual da conversa
SELECT estado, etapa_fluxo, contexto, ultima_mensagem_em
FROM wa_conversas
WHERE numero_whatsapp = '244923456789'
AND instancia_id = (
  SELECT id FROM wa_instancias WHERE clinica_id = '<clinicaId>'
);
```

**Resetar conversa manualmente:**
```sql
UPDATE wa_conversas
SET estado = 'AGUARDA_INPUT',
    etapa_fluxo = NULL,
    contexto = NULL
WHERE numero_whatsapp = '244923456789'
AND instancia_id = (SELECT id FROM wa_instancias WHERE clinica_id = '<clinicaId>');
```

Após o reset, o paciente pode escrever 'oi' para recomeçar.
