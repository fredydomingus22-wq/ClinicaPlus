# Reference: Evolution API — Polls nativas WhatsApp

## Por que Polls e não Buttons/List

| Método | Status com Baileys | Nota |
|--------|-------------------|------|
| `sendButtons` | ❌ Quebrado | Retorna 201 mas mensagem nunca entregue |
| `sendList` | ❌ Quebrado v2.3.7+ | Mesmo problema |
| `sendPoll` | ✅ Funciona | Nativo WhatsApp — estável |
| `sendText` | ✅ Funciona | Para mensagens informativas |

## Enviar Poll

```python
POST /message/sendPoll/{instanceName}
{
  "number":          "244923456789",   # sem "+" e sem "@s.whatsapp.net"
  "name":            "Que especialidade precisas?",  # título da poll
  "selectableCount": 1,                # 1 = escolha única; N = múltipla
  "values":          [                 # máx 12 opções
    "Cardiologia",
    "Pediatria",
    "Ortopedia",
    "Clínica Geral"
  ],
  "delay":           1200              # ms de delay antes de enviar (simula typing)
}
```

Resposta (sucesso):
```json
{
  "key": { "id": "poll-msg-id-abc123" },
  "status": "PENDING"
}
```

## Receber resposta à Poll

A resposta chega no evento **`messages.update`** — NÃO em `messages.upsert`.

```json
{
  "event": "messages.update",
  "instance": "clinica-abc",
  "data": [{
    "key": {
      "remoteJid": "244923456789@s.whatsapp.net",
      "id": "original-msg-id"
    },
    "update": {
      "pollUpdates": [{
        "pollUpdateMessageKey": { "id": "poll-msg-id-abc123" },
        "vote": {
          "selectedOptions": ["Cardiologia"]  // ← o texto da opção escolhida
        }
      }]
    }
  }]
}
```

## Extracção do voto

```python
def extrair_voto_poll(update: dict) -> str | None:
    try:
        poll_updates = update["update"]["pollUpdates"]
        if poll_updates:
            votes = poll_updates[0].get("vote", {}).get("selectedOptions", [])
            return votes[0] if votes else None
    except (KeyError, IndexError):
        pass
    return None
```

## Configurar webhook para receber MESSAGES_UPDATE

```python
# Obrigatório — sem este evento, respostas a Polls nunca chegam
await evolution.set_webhook(instanceName, {
    "url": f"{INTEL_URL}/webhook/whatsapp",
    "events": [
        "MESSAGES_UPSERT",   # mensagens de texto normais
        "MESSAGES_UPDATE",   # respostas a Polls  ← CRÍTICO
        "CONNECTION_UPDATE", # estado da conexão
    ]
})
```

## Limites

| Parâmetro | Limite |
|-----------|--------|
| Opções por Poll | máx 12 (WhatsApp hard limit) |
| Caracteres por opção | ~100 |
| selectableCount | 1 (única) ou igual ao número de opções (todas) |
| delay recomendado | 1000–1500ms (simula digitação humana) |

## Usar enviarTyping antes de responder

```python
# Antes de qualquer mensagem — mais natural
await evolution.enviar_typing(instanceName, numero, duracao_ms=1500)
await asyncio.sleep(1.5)
await evolution.enviar_poll(instanceName, numero, pergunta, opcoes)
```

## Mapeamento Poll → acção no sistema

Quando a resposta chega em `messages.update`, o texto da opção escolhida é passado directamente ao NLU:

```python
# O texto da Poll é controlado por nós → NLU classifica deterministicamente
"Cardiologia"         → NLU: intencao=MARCAR, especialidade=Cardiologia
"Dr. Carlos Mendes"   → NLU: intencao=MARCAR, medico_id=med-1 (fuzzy match ≥ 0.55)
"terça, 25 de março às 09:00" → NLU: intencao=MARCAR, data=2026-03-25
"✅ Confirmar"        → NLU: intencao=AFIRMACAO (100%)
"❌ Cancelar"         → NLU: intencao=NEGACAO  (100%)
"🔄 Recomeçar"        → NLU: intencao=RESET    (90%)
```

Esta é a vantagem fundamental das Polls: o texto das opções é determinístico, então o NLU classifica com 100% de precisão — sem ambiguidade.
