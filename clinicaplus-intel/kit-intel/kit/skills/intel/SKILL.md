---
name: intel
description: >
  Usa esta skill SEMPRE que tocares em qualquer ficheiro do serviço
  clinicaplus-intel: nlu/pipeline.py, dst/tracker.py, policy/dialogue_policy.py,
  nlg/generator.py, db/layer.py, noshow/*, routers/webhook.py, lib/evolution_client.py.
  Inclui TDD obrigatório: testes antes do código de produção.
references:
  - reference/nlu-slots.md
  - reference/dst-state.md
  - reference/policy-rules.md
  - reference/db-queries.md
  - reference/evolution-polls.md
  - reference/tdd-specs.md
  - reference/noshow-features.md
related_skills:
  - tdd/SKILL.md: ciclo RED→GREEN→REFACTOR — obrigatório
  - whatsapp/SKILL.md: contexto do módulo WhatsApp TypeScript
---

## Quando usar esta skill

- Implementar ou modificar qualquer ficheiro em `clinicaplus-intel/`
- Adicionar novas intenções ou slots ao NLU
- Modificar regras da Policy (novas acções, novas condições)
- Adicionar queries à DB layer
- Treinar ou avaliar o modelo de no-show
- Configurar webhook Evolution API para apontar para intel

## Quando NÃO usar

- Alterar o TypeScript API (usar skills do monorepo)
- Configurar instâncias Evolution API (responsabilidade TypeScript)
- Modificar o painel de administração React (usar skill whatsapp)
- Alterar o schema Prisma sem criar migration (sempre migration_00N)

---

## Regras absolutas — nunca violar

### 1. clinicaId em TODAS as queries
```python
# CORRECTO
rows = await c.fetch("SELECT * FROM medicos WHERE clinica_id = $1 AND ...", clinicaId, ...)

# ERRADO — vaza dados entre clínicas
rows = await c.fetch("SELECT * FROM medicos WHERE especialidade = $1", esp)
```

### 2. Parâmetros via $N — zero string interpolation
```python
# CORRECTO
await c.fetch("SELECT * FROM pacientes WHERE clinica_id = $1 AND telefone = $2", cid, tel)

# ERRADO — SQL injection
await c.fetch(f"SELECT * FROM pacientes WHERE telefone = '{telefone}'")
```

### 3. Writes sempre via TypeScript API — nunca directo
```python
# CORRECTO
await httpx.post(f"{TS_API_URL}/api/agendamentos", json={...}, headers={"x-api-key": KEY})

# ERRADO — bypassa validação, RBAC, event bus
await c.execute("INSERT INTO agendamentos ...")
```

### 4. sendPoll em vez de sendButtons/sendList
```python
# CORRECTO — funciona com Baileys
await evolution.enviar_poll(instance, numero, "Escolhe:", ["Opção A", "Opção B"])

# ERRADO — sendButtons retorna 201 mas mensagem nunca entregue no Baileys
await evolution.enviar_buttons(...)  # não implementar
```

### 5. Respostas a Polls via messages.update — não messages.upsert
```python
# CORRECTO — Polls chegam em messages.update com pollUpdates
elif event == "messages.update":
    for update in payload["data"]:
        if update.get("update", {}).get("pollUpdates"):
            escolha = extrair_voto_poll(update)

# ERRADO — messages.upsert não tem o voto da Poll
elif event == "messages.upsert":
    texto = msg["message"]["conversation"]  # polls não chegam aqui
```

### 6. HMAC verificado antes de qualquer processamento
```python
# CORRECTO
if not _verificar_hmac(body, x_evolution_hmac):
    raise HTTPException(401, "HMAC inválido")
# ... processar

# ERRADO — processar sem verificar
payload = json.loads(body)
await _processar_mensagem(...)
```

### 7. clinicaId resolvido pelo instanceName — nunca do payload
```python
# CORRECTO — instanceName é de confiança (configurado por nós)
clinicaId = await _resolver_clinica_id(instanciaName)

# ERRADO — payload pode ser forjado
clinicaId = payload.get("clinicaId")
```

---

## Pipeline obrigatório por mensagem

```
webhook recebido
    ↓
1. Verificar HMAC
2. Resolver clinicaId a partir de instanceName
3. Extrair número + texto (ou voto de poll)
4. Obter conversa (DST state) da DB
5. NLU.analisar(texto, medicos, especialidades)
6. DST.actualizar(estado, nlu, opcoes)
7. Identificar paciente por telefone (se não identificado)
8. Carregar histórico do paciente (para Policy)
9. Carregar slots (se especialidade ou médico preenchido)
10. Policy.decidir(estado, accoes, historico, opcoes)
11. Score no-show (se CRIAR_AGENDAMENTO)
12. Actualizar conversa na DB
13. Se CRIAR_AGENDAMENTO → chamar TypeScript API
14. NLG.gerar_mensagem() ou _decisao_para_poll()
15. enviar_poll() ou enviar_texto() via Evolution API
```

Nenhum passo pode ser saltado. Nenhuma lógica de negócio fora deste pipeline.

---

## Limites de Polls por contexto

| Etapa | Tipo de envio | Máx opções |
|-------|--------------|-----------|
| Especialidades | Poll | 8 (mostrar as mais usadas) |
| Médicos | Poll | 5 |
| Horários | Poll | 5 |
| Confirmação | Poll | 2 (✅ Confirmar / ❌ Cancelar) |
| Alternativas | Poll | 3 alternativas + "🔄 Recomeçar" |
| Texto livre | enviarTexto | N/A |

Polls com mais de 10 opções falham silenciosamente no WhatsApp. Nunca exceder.

---

## Tratamento de erros

```python
# Timeout Evolution API → guardar mensagem e retry
try:
    await enviar_poll(...)
except httpx.TimeoutException:
    await db.marcar_mensagem_para_retry(conversaId)
    # Não deixar a request do webhook falhar — Evolution API reenviar

# DB indisponível → resposta de fallback
except asyncpg.exceptions.ConnectionFailureError:
    # Log + resposta genérica ao paciente
    await enviar_texto(instance, numero, "Desculpa, estamos com dificuldades técnicas. Tenta novamente em instantes.")

# Erro inesperado → nunca propagar para o webhook
except Exception as e:
    logger.error(f"Erro não tratado: {e}", exc_info=True)
    # Retornar 200 para Evolution API não repetir o webhook
    return {"ok": True, "error": str(e)}
```

---

## Sub-skills disponíveis

- `reference/nlu-slots.md` — intenções suportadas, aliases pt-AO, thresholds
- `reference/dst-state.md` — shape do DialogueState, regras de merge de slots
- `reference/policy-rules.md` — todas as regras de decisão com prioridades
- `reference/db-queries.md` — 11 queries com índices e exemplos
- `reference/evolution-polls.md` — como enviar e receber Polls
- `reference/tdd-specs.md` — 40+ casos de teste para implementar
- `reference/noshow-features.md` — features do modelo, heurística, transição ML
