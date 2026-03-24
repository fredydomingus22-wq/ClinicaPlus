# Runbook — clinicaplus-intel

## Diagnóstico rápido

| Sintoma | Causa provável | Secção |
|---------|---------------|--------|
| Bot não responde a nenhuma mensagem | webhook não chega ao intel | 1 |
| Bot responde a texto mas não a Polls | evento MESSAGES_UPDATE não configurado | 2 |
| Respostas erradas / contexto misturado | DST state corrompido na DB | 3 |
| 401 nos webhooks | HMAC inválido | 4 |
| Latência > 500ms | DB pool esgotado ou query lenta | 5 |
| Bot não cria agendamentos | TypeScript API indisponível | 6 |

---

## 1. Bot não responde a nenhuma mensagem

```bash
# Verificar se o intel está UP
curl https://intel.clinicaplus.ao/health
# Deve retornar: { "status": "ok", "db": "connected" }

# Verificar logs Railway
railway logs --service clinicaplus-intel --tail 50

# Verificar configuração do webhook na Evolution API
curl -X GET "https://evolution.clinicaplus.ao/webhook/find/{instanceName}" \
  -H "apikey: $EVOLUTION_API_KEY"
# Campo "url" deve apontar para intel, não para n8n

# Corrigir webhook se necessário
curl -X POST "https://evolution.clinicaplus.ao/webhook/set/{instanceName}" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://intel.clinicaplus.ao/webhook/whatsapp",
    "events": ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"]
  }'
```

---

## 2. Bot não processa respostas a Polls

O evento `MESSAGES_UPDATE` não está configurado no webhook, ou o handler não está a processar `pollUpdates`.

```bash
# Verificar eventos configurados
curl "https://evolution.clinicaplus.ao/webhook/find/{instanceName}" \
  -H "apikey: $EVOLUTION_API_KEY" | jq ".events"
# Deve incluir "MESSAGES_UPDATE"

# Testar manualmente — enviar uma Poll e verificar logs
railway logs --service clinicaplus-intel --filter "messages.update" --tail 20

# Se os logs mostram "messages.update" recebido mas sem processamento:
# Verificar se pollUpdates está a ser extraído correctamente
# grep "extrair_voto_poll" nos logs de debug
```

---

## 3. Contexto misturado entre pacientes

Indica um bug no DST — o estado de uma conversa está a ser carregado para outra.

```bash
# Verificar uma conversa específica directamente na DB
# (via Supabase Dashboard → Table Editor → wa_conversas)

SELECT numero_whatsapp, contexto, ultima_mensagem_em
FROM wa_conversas
WHERE clinica_id = 'cli-xxx'
ORDER BY ultima_mensagem_em DESC
LIMIT 10;

# Se o contexto de um número tem dados de outro paciente:
# 1. Limpar o contexto corrompido
UPDATE wa_conversas
SET contexto = '{}', estado = 'AGUARDA_INPUT'
WHERE clinica_id = 'cli-xxx' AND numero_whatsapp = '244923456789';

# 2. O intel nunca partilha memória entre requests (FastAPI + asyncpg = stateless)
# O problema só pode ser na query de obter_conversa — verificar clinicaId
```

---

## 4. Webhooks a retornar 401

O HMAC não está a verificar correctamente.

```bash
# Verificar se EVOLUTION_WEBHOOK_SECRET está definido
railway variables --service clinicaplus-intel | grep EVOLUTION_WEBHOOK_SECRET

# Em desenvolvimento — desactivar HMAC temporariamente
# Definir EVOLUTION_WEBHOOK_SECRET="" (string vazia) bypassa a verificação
# NUNCA fazer isto em produção

# Verificar se a Evolution API está a enviar o header correcto
# No handler do webhook:
@router.post("/webhook/whatsapp")
async def webhook(request: Request, x_evolution_hmac: str = Header(None)):
    print(f"HMAC recebido: {x_evolution_hmac}")  # debug temporário
```

---

## 5. Latência elevada

```bash
# Verificar métricas do pool asyncpg
curl https://intel.clinicaplus.ao/intel/stats
# Campo "db_pool_size" e "db_pool_available"

# Se pool_available == 0: pool esgotado — aumentar max_size
# Em db/pool.py:
_pool = await asyncpg.create_pool(
    dsn=os.environ["DATABASE_URL"],
    min_size=2,
    max_size=15,  # aumentar de 10 para 15
    command_timeout=10.0,
)

# Verificar queries lentas no Supabase Dashboard
# Query > 100ms é sinal de índice em falta

# Confirmar que os índices existem:
SELECT indexname, tablename FROM pg_indexes
WHERE tablename IN ('wa_conversas', 'agendamentos', 'medicos', 'pacientes')
ORDER BY tablename;
```

---

## 6. Bot não cria agendamentos

O TypeScript API está indisponível ou a rejeitar o payload.

```bash
# Verificar health do TypeScript API
curl https://api.clinicaplus.ao/health

# Verificar se a chave interna está correcta
railway variables --service clinicaplus-intel | grep TS_API_INTERNAL_KEY

# Testar criação manual de agendamento via TS API
curl -X POST "https://api.clinicaplus.ao/api/agendamentos" \
  -H "x-api-key: $TS_API_INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pacienteId": "pac-xxx",
    "medicoId": "med-xxx",
    "dataHora": "2026-03-25T09:00:00Z",
    "canal": "WHATSAPP"
  }'

# Se retornar 402 PLAN_LIMIT_REACHED:
# A clínica atingiu o limite de consultas do plano — notificar admin
```

---

## 7. Forçar reset de conversa de um paciente

```bash
# Via Supabase Dashboard ou psql
UPDATE wa_conversas
SET
  contexto = '{}',
  estado = 'AGUARDA_INPUT',
  ultima_mensagem_em = NOW()
WHERE
  clinica_id = 'cli-xxx'
  AND numero_whatsapp = '244923456789';

# O paciente receberá o menu de boas-vindas na próxima mensagem
```

---

## 8. Deploy do modelo de no-show

```bash
# Quando o data_audit confirmar dados suficientes (≥ 100 amostras, ≥ 15 no-shows):

# Correr extractor
python -m noshow.data_extractor > /tmp/treino_check.json
cat /tmp/treino_check.json  # verificar diagnostico: SUFICIENTE

# Treinar
python -m noshow.trainer

# Verificar AUC (deve ser ≥ 0.68)
cat /data/models/report_*.json | jq ".auc_media"

# O predictor.py carrega o modelo automaticamente no próximo restart
# Ou forçar recarga:
curl -X POST https://intel.clinicaplus.ao/intel/modelo/reload
```
