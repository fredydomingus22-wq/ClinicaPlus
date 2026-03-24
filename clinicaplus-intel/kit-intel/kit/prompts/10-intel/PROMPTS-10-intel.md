# Task: Sprint 10 — Serviço clinicaplus-intel (FastAPI Python)

## METODOLOGIA OBRIGATÓRIA: TEST-DRIVEN DEVELOPMENT
Ciclo: RED (teste falha) → GREEN (mínimo código) → REFACTOR (limpar)
NUNCA escreves código de produção sem um teste a falhar primeiro.

---

## LEITURA OBRIGATÓRIA — confirma que leste todos antes de avançar

1. `docs/CLAUDE.md`                                               → regras absolutas
2. `docs/01-adr/ADR-014-intel-fastapi-sem-n8n.md`                → decisão arquitectural (n8n removido do caminho crítico)
3. `docs/11-modules/MODULE-intel.md`                              → spec completa do serviço
4. `kit/skills/intel/SKILL.md`                                    → regras absolutas + checklist
5. `kit/skills/intel/reference/nlu-slots.md`                      → intenções, aliases pt-AO, thresholds
6. `kit/skills/intel/reference/policy-rules.md`                   → regras de decisão com prioridades
7. `kit/skills/intel/reference/evolution-polls.md`                → como enviar e receber Polls
8. `kit/skills/intel/reference/tdd-specs.md`                      → 40+ casos de teste a implementar
9. `kit/skills/tdd/SKILL.md`                                      → ciclo TDD obrigatório
10. `docs/10-runbooks/RUNBOOK-intel.md`                           → diagnóstico e operações

Confirma que leste todos com: "Li os 10 ficheiros. A avançar para Passo 0."

---

## CONTEXTO DO PROJECTO

O ClinicaPlus é um SaaS B2B2C multi-tenant para clínicas privadas em Angola.
O `clinicaplus-intel` é um serviço FastAPI Python separado (Railway, porta 8001) que:
- Recebe webhooks da Evolution API directamente (sem n8n no caminho crítico)
- Processa mensagens WhatsApp de pacientes via pipeline NLU → DST → Policy → DB → NLG
- Lê dados do PostgreSQL via asyncpg (sem Prisma, sem ORM)
- Responde com Polls nativas WhatsApp (sendPoll) — o paciente toca, não escreve números
- Delega writes ao TypeScript API via HTTP interno

---

## PASSO 0 — Setup do projecto Python

### 0a. Criar estrutura de directórios
```bash
mkdir -p clinicaplus-intel/{routers,nlu,dst,policy,nlg,db,noshow,tests}
touch clinicaplus-intel/{main.py,requirements.txt,Dockerfile,.env.example}
touch clinicaplus-intel/nlu/pipeline.py
touch clinicaplus-intel/dst/tracker.py
touch clinicaplus-intel/policy/dialogue_policy.py
touch clinicaplus-intel/nlg/generator.py
touch clinicaplus-intel/db/{pool.py,layer.py}
touch clinicaplus-intel/noshow/{heuristica.py,predictor.py}
touch clinicaplus-intel/lib/evolution_client.py
touch clinicaplus-intel/tests/{test_nlu.py,test_dst.py,test_policy.py,test_db_layer.py}
```

### 0b. requirements.txt
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
httpx==0.27.0
pydantic==2.7.0
asyncpg==0.29.0
rapidfuzz==3.9.0
python-dateutil==2.9.0
scikit-learn==1.4.0
numpy==1.26.0
joblib==1.3.2
pytz==2024.1
python-multipart==0.0.9
pytest==8.0.0
pytest-asyncio==0.23.0
pytest-cov==4.1.0
```

### 0c. pytest.ini
```ini
[pytest]
asyncio_mode = auto
testpaths = tests
```

### 0d. Confirmar setup
```bash
cd clinicaplus-intel
python -m pytest tests/ --collect-only  # deve mostrar 0 testes (ainda)
```

---

## PASSO 1 — NLU Pipeline (TDD)

### RED: escrever testes primeiro
Copiar TODOS os testes de `kit/skills/intel/reference/tdd-specs.md` → `tests/test_nlu.py`.
Correr: `pytest tests/test_nlu.py` — TODOS devem falhar (ImportError).

### GREEN: implementar `nlu/pipeline.py`
Implementar a função `analisar(texto, medicos=None, especialidades=None) → NLUResult`.

Regras obrigatórias do NLU:
- ALIASES pt-AO completos (ver `reference/nlu-slots.md`)
- Período com `re.search(r'\b' + re.escape(kw) + r'\b', t)` — word boundary obrigatório
- Match de médico SÓ se "dr/dra/doutor" presente no texto E score ≥ 0.55
- AFIRMACAO/NEGACAO/RESET/AJUDA → NÃO extraem slots (parar pipeline imediatamente)
- Parser de datas nativo pt-AO (sem depender de "tomorrow"/"today" strings inglesas)
- Urgência respeita especialidade inferida (ex: "filha com febre" → Pediatria, não Clínica Geral)

Correr: `pytest tests/test_nlu.py` — mínimo 22/26 a passar.

### REFACTOR
- Extrair constantes para o topo do ficheiro
- Separar `extrair_especialidade`, `get_medico`, `get_data`, `get_periodo` como funções puras
- Documentar cada função com docstring

---

## PASSO 2 — Dialogue State Tracker (TDD)

### RED: escrever testes
Copiar testes de `tdd-specs.md` → `tests/test_dst.py`.
Correr: `pytest tests/test_dst.py` — todos falham.

### GREEN: implementar `dst/tracker.py`

```python
@dataclass
class DialogueState:
    especialidade:  Optional[str] = None
    medicoId:       Optional[str] = None
    medicoNome:     Optional[str] = None
    data_iso:       Optional[str] = None
    dataLabel:      Optional[str] = None
    periodo:        Optional[dict] = None
    slotHorario:    Optional[str] = None
    slotLabel:      Optional[str] = None
    pacienteId:     Optional[str] = None
    turno:          int = 0
    erros:          int = 0
    ultimaAccao:    Optional[str] = None
    caminhoSlots:   list = field(default_factory=list)

    def proximo_slot_em_falta(self) -> Optional[str]:
        for slot in ["especialidade", "data_iso", "slotHorario"]:
            if getattr(self, slot) is None:
                return slot.replace("_iso", "").replace("Horario", "Horario")
        return None

    def esta_completo(self) -> bool:
        return all([self.especialidade, self.data_iso, self.slotHorario])
```

Regra de merge de slots: **slots nunca retrocedem** — só actualizar se o slot está vazio.

Correr: `pytest tests/test_dst.py` — todos a passar.

---

## PASSO 3 — Policy (TDD)

### RED → GREEN → REFACTOR: `policy/dialogue_policy.py`

Implementar seguindo EXACTAMENTE as prioridades em `reference/policy-rules.md`:
1. URGENCIA_DETECTADA → acção URGENCIA (especialidade inferida, não forçar Clínica Geral)
2. AJUDA_SOLICITADA ou erros ≥ 4 → ENCAMINHAR_HUMANO
3. RESET_SOLICITADO → RESET
4. ultimaAccao == AGUARDA_CONFIRMACAO + CONFIRMACAO:AFIRMACAO → CRIAR_AGENDAMENTO
5. ultimaAccao == AGUARDA_CONFIRMACAO + CONFIRMACAO:NEGACAO → ALTERNATIVAS
6. turno == 1 + historico disponível → SUGERIR_HISTORICO
7. Próximo slot em falta → MOSTRAR_OPCOES ou SOLICITAR_SLOT
8. Completo → CONFIRMAR

**Regra do médico único:** se especialidade tem 1 médico → saltar ESCOLHA_MEDICO automaticamente.
**Regra de 1 slot:** se apenas 1 slot disponível → CONFIRMAR directamente (saltar Poll de escolha).

Correr: `pytest tests/test_policy.py` — todos a passar.

---

## PASSO 4 — DB Layer (TDD)

### RED → GREEN → REFACTOR: `db/layer.py` + `db/pool.py`

**pool.py:** asyncpg pool singleton com `statement_cache_size=0` (Supabase PgBouncer).

**layer.py:** implementar `ClinicaDB` com todos os 11 métodos.
Ver shapes exactos no `MODULE-intel.md` secção 4.

**Regras absolutas:**
- `clinicaId` como $1 em TODAS as queries
- Parâmetros via `$N` — ZERO string interpolation
- Métodos `async def` com `async with conn() as c:`

**WaFormatter:** implementar 7 métodos estáticos.

Correr: `pytest tests/test_db_layer.py` — todos a passar (com mocks).

---

## PASSO 5 — NLG Generator

### `nlg/generator.py`

Implementar `gerar_mensagem(decisao, estado, nome_clinica) → str`.

Templates obrigatórios (ver `MODULE-intel.md` secção 4 — TEMPLATES dict):
- `boas_vindas`, `sugestao_repetir`, `lista_especialidades`
- `lista_horarios`, `confirmar_unico_slot`, `confirmacao_final`
- `confirmado`, `urgencia`, `alternativas_pos_recusa`
- `humano`, `sem_slots_alternativas`, `pedir_data`

Todos os textos em **pt-AO**. Emojis moderados (1-2 por mensagem).

---

## PASSO 6 — Evolution Client

### `lib/evolution_client.py`

Implementar:
- `async def enviar_texto(instance, numero, texto) → dict`
- `async def enviar_poll(instance, numero, pergunta, opcoes, seleccao_multipla=False) → dict`
- `async def enviar_typing(instance, numero, duracao_ms=1500)`

Regra: `sendPoll` SEMPRE. NUNCA implementar `sendButtons` ou `sendList`.
Timeout: 10.0 segundos. Raise em erro HTTP.

---

## PASSO 7 — Webhook Router

### `routers/webhook.py`

Implementar o endpoint `POST /webhook/whatsapp` seguindo EXACTAMENTE o pipeline de 15 passos em `MODULE-intel.md` secção 4.

Verificações obrigatórias:
1. HMAC antes de qualquer processamento
2. clinicaId resolvido por instanceName (nunca do payload)
3. `messages.update` → extrair voto de Poll via `extrair_voto_poll()`
4. `messages.upsert` → extrair texto normal
5. Retornar sempre 200 (mesmo em erro — para Evolution API não repetir)

Handler de erros: qualquer excepção não tratada → log + retornar `{"ok": True, "error": str(e)}`.

---

## PASSO 8 — main.py + health + admin

### `main.py`
```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
from .routers import webhook, health, admin
from .db.pool import init_pool, close_pool

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()

app = FastAPI(title="ClinicaPlus Intelligence", version="1.0.0", lifespan=lifespan)
app.include_router(webhook.router)
app.include_router(health.router)
app.include_router(admin.router, prefix="/intel")
```

### `routers/health.py`
```python
@router.get("/health")
async def health():
    pool = await get_pool()
    async with pool.acquire() as c:
        await c.fetchval("SELECT 1")
    return {"status": "ok", "db": "connected", "version": "1.0.0"}
```

---

## PASSO 9 — No-show Predictor

### `noshow/heuristica.py`
Implementar `calcular_score(sinais: SinaisRisco) → dict` com os pesos calibrados para Angola.

Factores e pesos:
- taxa_noshow_historica × 0.45 (maior peso — literatura confirma)
- lead_time > 30 dias: +0.20
- lead_time > 14 dias: +0.12
- primeira_consulta: +0.10
- hora ≤ 8h (cedo em Luanda): +0.10
- total_cancelamentos ≥ 3: +0.12
- marcou_via_whatsapp: -0.06 (protector)
- respondeu_lembrete: -0.25 (FORTÍSSIMO sinal positivo)

Retornar: `{ score, nivel, tipo_lembrete, enviar_segundo, raciocinio }`

### `noshow/predictor.py`
Implementar `NoShowPredictor` que tenta carregar modelo de `/data/models/noshow_latest.joblib`.
Se AUC < 0.68 ou n < 150 → usar heurística automaticamente.
Singleton: `predictor = NoShowPredictor()`.

---

## PASSO 10 — Dockerfile + Deploy Railway

### Dockerfile
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
```

### Configurar webhook na Evolution API
Depois do deploy, para cada clínica activa, actualizar o webhook:
```bash
# Via endpoint do TypeScript API
POST /api/whatsapp/instancias/{id}/migrar-webhook
# Este endpoint deve actualizar a URL do webhook na Evolution API
# de n8n para intel
```

### Variáveis de ambiente Railway (clinicaplus-intel)
```
DATABASE_URL=...           # Supabase connection string (PgBouncer port 6543)
EVOLUTION_API_URL=...
EVOLUTION_API_KEY=...
EVOLUTION_WEBHOOK_SECRET=...
TS_API_URL=...
TS_API_INTERNAL_KEY=...
PORT=8001
ENVIRONMENT=production
MODEL_DIR=/data/models     # Railway Volume
```

---

## CHECKLIST FINAL — antes de marcar o sprint como concluído

### Testes
- [ ] `pytest tests/ --cov=. --cov-fail-under=85` passa
- [ ] `test_nlu.py`: ≥ 22/26 casos passam
- [ ] `test_dst.py`: todos passam
- [ ] `test_policy.py`: todos passam
- [ ] `test_db_layer.py`: todos passam (com mocks)

### Funcional (testar manualmente via ngrok em desenvolvimento)
- [ ] "oi" → Poll de especialidades
- [ ] "quero marcar cardio para amanhã" → Poll de horários directamente (salta especialidade)
- [ ] "sim" → confirmação e chamada ao TypeScript API
- [ ] "Cardiologia" (resposta a Poll) → Poll de médicos ou horários
- [ ] "tenho dor urgente" → URGÊNCIA, Clínica Geral, slots de hoje
- [ ] "minha filha tem febre" → URGÊNCIA, Pediatria (não Clínica Geral)
- [ ] 4 erros consecutivos → encaminhamento para humano

### Segurança
- [ ] Webhook sem HMAC → 401
- [ ] clinicaId nunca vem do payload — sempre do instanceName
- [ ] Zero writes directos à DB (excepto wa_conversas e wa_mensagens)

### Performance
- [ ] `GET /health` < 50ms
- [ ] Mensagem simples ("oi") processada em < 100ms (sem Evolution API)
- [ ] Query mais lenta < 50ms (verificar via logs asyncpg)

---

## Notas importantes

**N8N:** o n8n NÃO deve receber webhooks de mensagens WhatsApp. Se ainda houver workflows n8n a processar mensagens, desactivá-los ANTES de activar o intel.

**Migração:** ao activar o intel, actualizar o webhook de CADA instância Evolution API activa. Fazer uma de cada vez, verificando que funciona antes de passar à seguinte.

**Rollback:** se algo correr mal, reverter o webhook de volta para n8n temporariamente enquanto se corrige o problema.

---

## PASSO 11 — Redis: Lock, Cache, Dedup, Rate Limit

**Ler primeiro:** `kit/skills/intel/reference/redis-cache-jobs.md`

### 11a. Redis client singleton
Criar `lib/redis_client.py` com `get_redis()` e `close_redis()`.
Adicionar ao lifespan do main.py.

### 11b. Session lock — CRÍTICO
Criar `lib/session_lock.py`.
Integrar no `_processar_mensagem()` como camada 2 (após dedup, antes de qualquer leitura de estado).

**Teste obrigatório:**
```python
@pytest.mark.asyncio
async def test_lock_previne_corrida():
    """Duas chamadas simultâneas para o mesmo número processam sequencialmente."""
    import asyncio
    resultados = []
    async def processar(delay):
        async with session_lock("cli-1", "244923000000"):
            await asyncio.sleep(delay)
            resultados.append(delay)
    await asyncio.gather(processar(0.1), processar(0.05))
    assert resultados == [0.1, 0.05]  # o primeiro a obter o lock termina primeiro
```

### 11c. Deduplicação
Criar `lib/dedup.py`.
Integrar no webhook handler ANTES do lock.

### 11d. Cache de especialidades e médicos
Criar `lib/cache.py` com `get_especialidades()`, `get_medicos_activos()`, `invalidar_cache_clinica()`.
Substituir chamadas directas a `db.especialidades_activas()` e `db.todos_medicos_activos()` no handler.
Endpoint `POST /intel/cache/invalidar/{clinicaId}` em `routers/admin.py`.

### 11e. Rate limiting
Criar `lib/rate_limiter.py`.
Integrar no webhook handler como camada 1 (antes do lock).

### 11f. Actualizar requirements.txt
```
redis[asyncio]==5.0.1
apscheduler==3.10.4
```

### 11g. Actualizar variáveis de ambiente
```env
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6380
```

---

## PASSO 12 — Jobs assíncronos (APScheduler)

**Ler primeiro:** secções 6, 7, 8 de `reference/redis-cache-jobs.md`

### 12a. Scheduler
Criar `jobs/scheduler.py` com os 3 jobs configurados.
Integrar no lifespan do `main.py`.

### 12b. Job: expirar conversas
Criar `jobs/expirar_conversas.py`.
Corre às 03:00 Luanda. Reseta estado de conversas com `ultima_mensagem_em < NOW() - 24h`.

### 12c. Job: lembretes proactivos
Criar `jobs/lembrete_proactivo.py`.
Corre às 08:00 Luanda. Envia Poll de confirmação a pacientes com consulta em 48h que não confirmaram.

### 12d. Job: retreino do modelo
Criar `jobs/retrain_noshow.py`.
Corre às segundas-feiras às 02:00. Chama `noshow/trainer.py` se dados suficientes.

### Checklist adicional
- [ ] `GET /health` inclui `{ "redis": "connected" }`
- [ ] Lock de sessão activo — testado com 2 mensagens simultâneas
- [ ] Deduplicação activa — webhook repetido ignorado
- [ ] Cache de especialidades activa — 0 queries à DB para especialidades em mensagens normais
- [ ] Rate limit activo — número com >15 msgs/min ignorado silenciosamente
- [ ] Job de expiração configurado — `scheduler.get_jobs()` mostra 3 jobs
- [ ] Job de lembretes configurado e testado em modo dry-run

