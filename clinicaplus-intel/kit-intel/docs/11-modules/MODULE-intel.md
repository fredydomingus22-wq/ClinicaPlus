# MODULE — clinicaplus-intel (Serviço de Inteligência Python)

**Versão:** 1.0  
**Stack:** Python 3.12 · FastAPI · asyncpg · scikit-learn · Railway  
**Porta:** 8001  
**ADR:** ADR-014

---

## 1. Responsabilidade

O `clinicaplus-intel` é o cérebro do bot WhatsApp. Recebe todas as mensagens de pacientes directamente da Evolution API, processa-as através de um pipeline TOD (Task-Oriented Dialogue), e responde com Polls nativas ou texto formatado.

**O que faz:**
- Recebe webhooks da Evolution API (mensagens + respostas a Polls)
- Classifica intenção e extrai slots via NLU
- Mantém o estado da conversa via DST
- Decide a próxima acção via Policy
- Lê dados da DB directamente via asyncpg
- Gera respostas em pt-AO formatadas para WhatsApp
- Prevê risco de no-show por paciente
- Delega writes ao TypeScript API

**O que NÃO faz:**
- Escrever directamente na DB (excepto `wa_conversas` e `wa_mensagens`)
- Autenticar utilizadores (usa clinicaId extraído do webhook)
- Gerir instâncias Evolution API (responsabilidade do TypeScript)

---

## 2. Schema Prisma — migration_008_intel

Adicionar ao schema existente (additive — sem breaking changes):

```prisma
model WaConversa {
  id               String   @id @default(cuid())
  clinicaId        String
  instanciaId      String
  numeroWhatsapp   String
  estado           String   @default("AGUARDA_INPUT")
  // DST: slots acumulados como JSON
  // Shape: { especialidade, medicoId, medicoNome, data, dataLabel, periodo,
  //          slotHorario, slotLabel, pacienteId, turno, erros, ultimaAccao,
  //          caminhoSlots[] }
  contexto         Json     @default("{}")
  pushName         String?  // nome do paciente no WhatsApp
  ultimaMensagemEm DateTime @default(now())
  expiraEm         DateTime?  // TTL: 24h após última mensagem
  criadoEm         DateTime @default(now())

  clinica   Clinica      @relation(fields: [clinicaId], references: [id])
  mensagens WaMensagem[]

  @@unique([instanciaId, numeroWhatsapp])
  @@index([clinicaId])
  @@index([expiraEm])  // para job de expiração
  @@map("wa_conversas")
}

model WaMensagem {
  id          String   @id @default(cuid())
  conversaId  String
  clinicaId   String
  direcao     String   // ENTRADA | SAIDA
  tipo        String   // TEXT | POLL | POLL_RESPONSE | AUDIO
  conteudo    String   // texto ou JSON serializado
  criadoEm   DateTime @default(now())

  conversa WaConversa @relation(fields: [conversaId], references: [id])

  @@index([conversaId])
  @@index([clinicaId, criadoEm])
  @@map("wa_mensagens")
}

// Adicionar ao model Paciente existente:
// perfilWa  Json?  // aprendizagem entre sessões — shape definida abaixo

// Shape de perfilWa:
// {
//   totalConversas: int,
//   totalMarcacoes: int,
//   totalAbandonos: int,
//   especialidades: { [nome]: count },
//   medicoPreferidoId: string | null,
//   ultimaMarcacao: { especialidade, medicoId, medicoNome, data } | null,
//   historiaHoras: int[],         // últimas 10 horas de consulta
//   horaMédiaPreferida: int | null,
//   historicoNoShow: bool[],      // últimos 20 resultados
//   taxaNoShow: float,
// }
```

---

## 3. Estrutura de ficheiros

```
clinicaplus-intel/
│
├── main.py                        # FastAPI app, routers, startup
├── requirements.txt
├── Dockerfile                     # Railway deploy
│
├── routers/
│   ├── webhook.py                 # POST /webhook/whatsapp  ← entrada principal
│   ├── health.py                  # GET /health
│   └── admin.py                   # GET /intel/stats, GET /intel/modelo/status
│
├── nlu/
│   └── pipeline.py                # analisar(texto, medicos, especialidades) → NLUResult
│
├── dst/
│   └── tracker.py                 # DialogueStateTracker.actualizar() → (estado, accoes)
│
├── policy/
│   └── dialogue_policy.py         # DialoguePolicy.decidir() → PolicyDecision
│
├── nlg/
│   └── generator.py               # gerar_mensagem(decisao, estado, clinica) → str
│
├── db/
│   ├── pool.py                    # asyncpg pool singleton
│   └── layer.py                   # ClinicaDB (11 queries) + WaFormatter (7 métodos)
│
├── noshow/
│   ├── heuristica.py              # calcular_score(sinais) → dict
│   ├── predictor.py               # NoShowPredictor (switch heurística ↔ ML)
│   ├── data_extractor.py          # SQL → DataFrame para treino
│   ├── trainer.py                 # treinar(df) → report
│   └── retrain_job.py             # job nocturno de retreino
│
└── tests/
    ├── test_nlu.py                # 26+ casos, cobertura 90%
    ├── test_dst.py
    ├── test_policy.py
    └── test_db_layer.py           # mocks asyncpg
```

---

## 4. Endpoint principal — POST /webhook/whatsapp

```python
# routers/webhook.py

from fastapi import APIRouter, Request, HTTPException, Header
import hmac, hashlib, json
from ..nlu.pipeline    import analisar
from ..dst.tracker     import DialogueStateTracker
from ..policy.dialogue_policy import DialoguePolicy
from ..nlg.generator   import gerar_mensagem
from ..db.layer        import db, WaFormatter
from ..noshow.predictor import predictor

router = APIRouter()
dst    = DialogueStateTracker()
policy = DialoguePolicy()

@router.post("/webhook/whatsapp")
async def webhook_whatsapp(
    request: Request,
    x_evolution_hmac: str = Header(None),
):
    body = await request.body()

    # 1. Verificar HMAC (obrigatório — Evolution API assina todos os webhooks)
    if not _verificar_hmac(body, x_evolution_hmac):
        raise HTTPException(status_code=401, detail="HMAC inválido")

    payload = json.loads(body)
    event   = payload.get("event")

    # 2. Extrair contexto do webhook
    instanciaName = payload.get("instance")
    clinicaId     = await _resolver_clinica_id(instanciaName)
    if not clinicaId:
        return {"ok": True}  # instância desconhecida — ignorar silenciosamente

    # 3. Router por tipo de evento
    if event == "messages.upsert":
        msg = payload.get("data", {}).get("messages", [{}])[0]
        if msg.get("key", {}).get("fromMe"):
            return {"ok": True}  # ignorar mensagens enviadas pelo bot

        numero   = msg["key"]["remoteJid"].replace("@s.whatsapp.net", "")
        texto    = msg.get("message", {}).get("conversation", "") or \
                   msg.get("message", {}).get("extendedTextMessage", {}).get("text", "")
        pushName = msg.get("pushName", "")

        if texto:
            await _processar_mensagem(clinicaId, instanciaName, numero, texto, pushName)

    elif event == "messages.update":
        # Respostas a Polls vêm aqui
        for update in payload.get("data", []):
            if update.get("update", {}).get("pollUpdates"):
                numero  = update["key"]["remoteJid"].replace("@s.whatsapp.net", "")
                escolha = _extrair_voto_poll(update)
                if escolha:
                    await _processar_mensagem(clinicaId, instanciaName, numero, escolha, "")

    return {"ok": True}


async def _processar_mensagem(
    clinicaId: str,
    instanciaName: str,
    numero: str,
    texto: str,
    pushName: str,
):
    """Pipeline completo: NLU → DST → Policy → DB → NLG → Evolution API"""

    # Buscar contexto actual da conversa
    conversa = await db.obter_conversa(clinicaId, instanciaName, numero)
    estado   = _deserializar_estado(conversa.contexto if conversa else {})

    # Buscar dados necessários para o NLU
    especialidades = await db.especialidades_activas(clinicaId)
    medicos_todos  = await db.todos_medicos_activos(clinicaId)

    # NLU: classificar intenção + extrair slots
    nlu = analisar(texto, medicos_todos, especialidades)

    # DST: actualizar estado com novos slots
    opcoes = {
        "especialidades": especialidades,
        "medicos":        medicos_todos,
        "slots":          [],  # carregado pela Policy se necessário
    }
    estado, accoes = dst.actualizar(estado, nlu, opcoes)

    # Identificar paciente pelo número (se ainda não identificado)
    if not estado.pacienteId:
        paciente = await db.paciente_por_telefone(clinicaId, f"+{numero}")
        if paciente:
            estado.pacienteId = paciente.id

    # Histórico do paciente para Policy
    historico = None
    if estado.pacienteId:
        hist_ags   = await db.historico_agendamentos_paciente(clinicaId, estado.pacienteId, limite=3)
        stats      = await db.stats_no_show_paciente(clinicaId, estado.pacienteId)
        historico  = {
            "total":        stats["total"],
            "ultimaMarcacao": {
                "especialidade": hist_ags[0].medicoEsp if hist_ags else None,
                "medicoNome":    hist_ags[0].medicoNome if hist_ags else None,
            } if hist_ags else None,
        }

    # Carregar slots se Policy vai precisar
    if estado.especialidade or estado.medicoId:
        from datetime import date, timedelta, datetime, timezone
        LUANDA = timezone(timedelta(hours=1))
        data_alvo = date.fromisoformat(estado.data) if estado.data \
                    else (datetime.now(LUANDA) + timedelta(days=1)).date()

        if estado.medicoId:
            slots = await db.slots_por_regra(
                clinicaId, estado.medicoId, data_alvo,
                periodo_ini=estado.periodo["inicio"] if estado.periodo else None,
                periodo_fim=estado.periodo["fim"]    if estado.periodo else None,
            )
        else:
            # Buscar slots de todos os médicos da especialidade
            medicos_esp = await db.medicos_por_especialidade(clinicaId, estado.especialidade)
            slots = []
            for m in medicos_esp:
                s = await db.slots_por_regra(clinicaId, m.id, data_alvo, limite=3)
                slots.extend(s)
            slots.sort(key=lambda s: s.dataHora)

        opcoes["slots"] = slots

    # Policy: decidir próxima acção
    decisao = policy.decidir(estado, accoes, historico, opcoes)

    # Score de no-show (se Policy vai criar agendamento)
    if decisao.accao == "CRIAR_AGENDAMENTO" and estado.pacienteId:
        from ..noshow.heuristica import SinaisRisco, calcular_score
        sinais = SinaisRisco(
            lead_time_dias        = _calc_lead_time(estado.slotHorario),
            hora_consulta         = int(estado.slotHorario[11:13]) if estado.slotHorario else 9,
            dia_semana            = 0,
            total_consultas       = stats.get("total", 0),
            taxa_noshow_historica = stats.get("taxa_no_show", 0.0),
            total_cancelamentos   = stats.get("cancelamentos", 0),
            marcou_via_whatsapp   = True,
            lembrete_enviado      = False,
            lembrete_respondido   = False,
            primeira_consulta     = stats.get("total", 0) == 0,
            tem_seguro            = False,
        )
        score_noshow = calcular_score(sinais)
        decisao.dados_extra["scoreNoShow"] = score_noshow

    # Actualizar estado da conversa na DB
    estado.ultimaAccao = decisao.accao
    await db.actualizar_conversa(clinicaId, instanciaName, numero, estado, pushName)

    # Se Policy diz CRIAR_AGENDAMENTO → chamar TypeScript API
    if decisao.accao == "CRIAR_AGENDAMENTO":
        await _criar_agendamento_via_ts_api(clinicaId, estado, decisao)

    # NLG: gerar mensagem
    clinica_nome = await db.nome_clinica(clinicaId)

    # Enviar resposta via Evolution API
    if decisao.template_mensagem in ("lista_especialidades", "lista_horarios",
                                      "lista_medicos", "confirmar_unico_slot",
                                      "confirmacao_final", "alternativas_pos_recusa",
                                      "sem_slots_alternativas"):
        # Usar Poll nativa
        poll_data = _decisao_para_poll(decisao, opcoes)
        if poll_data:
            await _enviar_poll(instanciaName, numero, poll_data)
            return

    # Texto simples para restantes casos
    mensagem = gerar_mensagem(decisao, estado, clinica_nome)
    await _enviar_texto(instanciaName, numero, mensagem)


def _verificar_hmac(body: bytes, signature: str) -> bool:
    import os
    secret  = os.environ.get("EVOLUTION_WEBHOOK_SECRET", "")
    if not secret or not signature:
        return True  # desenvolvimento local
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")

def _extrair_voto_poll(update: dict) -> str | None:
    """Extrai o texto da opção votada na Poll."""
    try:
        poll_updates = update["update"]["pollUpdates"]
        if poll_updates:
            # Evolution API v2 desencripta o voto
            votes = poll_updates[0].get("vote", {}).get("selectedOptions", [])
            return votes[0] if votes else None
    except (KeyError, IndexError):
        pass
    return None

def _decisao_para_poll(decisao, opcoes: dict) -> dict | None:
    """Converte PolicyDecision numa estrutura { pergunta, opcoes } para sendPoll."""
    dados = decisao.dados_extra

    if decisao.template_mensagem == "lista_especialidades":
        return {
            "pergunta": "Que especialidade precisas?",
            "opcoes":   dados.get("opcoes", [])[:10],
        }
    if decisao.template_mensagem == "lista_medicos":
        medicos = dados.get("medicos", [])
        return {
            "pergunta": "Escolhe o médico:",
            "opcoes":   [f"{m['nome']} — {m['preco']:,} Kz".replace(",",".") for m in medicos][:10],
        }
    if decisao.template_mensagem in ("lista_horarios", "confirmar_unico_slot"):
        slots = dados.get("slots", [])
        poll  = WaFormatter.slots_como_poll(slots)
        return poll
    if decisao.template_mensagem in ("confirmacao_final",):
        return {
            "pergunta": "Confirmas a consulta?",
            "opcoes":   ["✅ Confirmar", "❌ Cancelar"],
        }
    if decisao.template_mensagem in ("alternativas_pos_recusa", "sem_slots_alternativas"):
        alts = dados.get("alternativas", [])
        if alts:
            return {
                "pergunta": "Encontrei estas alternativas:",
                "opcoes":   [a["label"] for a in alts[:5]] + ["🔄 Recomeçar"],
            }
    return None

def _calc_lead_time(slot_iso: str | None) -> float:
    if not slot_iso:
        return 1.0
    from datetime import datetime, timezone, timedelta
    LUANDA = timezone(timedelta(hours=1))
    slot = datetime.fromisoformat(slot_iso).astimezone(LUANDA)
    agora = datetime.now(LUANDA)
    return max((slot - agora).days, 0)
```

---

## 5. Evolution API — métodos Python

```python
# lib/evolution_client.py

import os, httpx
from typing import Optional

EVOLUTION_URL = os.environ["EVOLUTION_API_URL"]    # ex: https://evolution.clinicaplus.ao
EVOLUTION_KEY = os.environ["EVOLUTION_API_KEY"]    # Global API key

_headers = {
    "Content-Type":  "application/json",
    "apikey":        EVOLUTION_KEY,
}

async def enviar_texto(instance: str, numero: str, texto: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{EVOLUTION_URL}/message/sendText/{instance}",
            headers=_headers,
            json={"number": numero, "text": texto, "delay": 1000},
            timeout=10.0,
        )
        r.raise_for_status()
        return r.json()

async def enviar_poll(
    instance:           str,
    numero:             str,
    pergunta:           str,
    opcoes:             list[str],   # máx 12
    seleccao_multipla:  bool = False,
) -> dict:
    """
    Usa sendPoll — única alternativa funcional ao Baileys.
    sendButtons e sendList estão quebrados (retornam 201 mas não entregam).
    A resposta chega via evento messages.update com pollUpdates.
    """
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{EVOLUTION_URL}/message/sendPoll/{instance}",
            headers=_headers,
            json={
                "number":          numero,
                "name":            pergunta,
                "selectableCount": len(opcoes) if seleccao_multipla else 1,
                "values":          opcoes[:12],  # hard limit WhatsApp
                "delay":           1200,
            },
            timeout=10.0,
        )
        r.raise_for_status()
        return r.json()

async def enviar_typing(instance: str, numero: str, duracao_ms: int = 1500):
    """Mostra 'a escrever...' antes de responder — mais humano."""
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{EVOLUTION_URL}/chat/sendPresence/{instance}",
            headers=_headers,
            json={"number": numero, "options": {"presence": "composing", "delay": duracao_ms}},
            timeout=5.0,
        )
```

---

## 6. Variáveis de ambiente

```env
# clinicaplus-intel (Railway)
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true  # Supabase PgBouncer
EVOLUTION_API_URL=https://evolution.clinicaplus.ao
EVOLUTION_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
EVOLUTION_WEBHOOK_SECRET=secret-hmac-para-verificar-webhooks
TS_API_URL=https://api.clinicaplus.ao                             # TypeScript API interna
TS_API_INTERNAL_KEY=cp_internal_xxxxxxxxxxxxxxxxxxxx             # Key interna M2M
PORT=8001
ENVIRONMENT=production
MODEL_DIR=/data/models                                            # Railway Volume para modelos ML
```

---

## 7. Configurar webhook na Evolution API

Após o deploy do `clinicaplus-intel`, actualizar o webhook de cada instância:

```bash
# Via TypeScript API (quando a clínica activa o WhatsApp)
# apps/api/src/services/wa-instancia.service.ts

await evolutionApi.setWebhook(instanceName, {
  url:     `${config.INTEL_URL}/webhook/whatsapp`,
  webhook_by_events: false,
  webhook_base64:    false,
  events: [
    "MESSAGES_UPSERT",    # mensagens de texto
    "MESSAGES_UPDATE",    # respostas a polls  ← CRÍTICO
    "CONNECTION_UPDATE",  # estado da ligação
  ],
});
```

---

## 8. main.py

```python
# main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from .routers import webhook, health, admin
from .db.pool import init_pool, close_pool

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()

app = FastAPI(
    title="ClinicaPlus Intelligence",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None,   # desactivar Swagger em produção
    redoc_url=None,
)

app.include_router(webhook.router, tags=["Webhook"])
app.include_router(health.router,  tags=["Health"])
app.include_router(admin.router,   prefix="/intel", tags=["Admin"])
```

---

## 9. requirements.txt

```
# Web
fastapi==0.115.0
uvicorn[standard]==0.30.0
httpx==0.27.0
pydantic==2.7.0

# DB
asyncpg==0.29.0

# NLU
rapidfuzz==3.9.0       # fuzzy match de médicos e especialidades
python-dateutil==2.9.0  # parsing de datas

# ML (no-show predictor)
scikit-learn==1.4.0
numpy==1.26.0
pandas==2.2.0
joblib==1.3.2
xgboost==2.0.3         # fase 2 (instalar quando tiveres dados)
imbalanced-learn==0.12.0  # SMOTE para class imbalance

# Utils
pytz==2024.1
python-multipart==0.0.9
```

---

## 10. Checklist de verificação

### Deploy
- [ ] `clinicaplus-intel` service criado no Railway
- [ ] Todas as env vars configuradas (DATABASE_URL, EVOLUTION_API_URL, etc.)
- [ ] Volume `/data/models` montado para modelos ML
- [ ] migration_008 aplicada (wa_conversas, wa_mensagens, perfilWa em Paciente)
- [ ] Webhook de cada instância Evolution API aponta para intel URL

### Funcional
- [ ] `GET /health` retorna `{ status: "ok", db: "connected" }`
- [ ] Mensagem "oi" → bot responde com menu de especialidades (Poll)
- [ ] "quero marcar cardio para amanhã" → bot vai directo para Poll de horários
- [ ] "sim" → bot cria agendamento via TypeScript API
- [ ] Resposta a Poll → bot processa via `messages.update` (não `messages.upsert`)
- [ ] Sessões isoladas: 2 pacientes simultâneos não partilham contexto

### Segurança
- [ ] HMAC verificado em todos os webhooks (rejeita sem header)
- [ ] clinicaId resolvido a partir do instanceName (nunca do payload)
- [ ] Nenhuma write directa à DB (excepto wa_conversas e wa_mensagens)
- [ ] TS_API_INTERNAL_KEY rotacionável sem downtime

### Testes
- [ ] `pytest tests/ --cov=. --cov-report=term` ≥ 85% cobertura
- [ ] `test_nlu.py`: 26 casos, 92%+ pass rate
- [ ] `test_dst.py`: slots preenchidos, slots em falta, erros consecutivos
- [ ] `test_policy.py`: urgência, saltar etapas, alternativas, encaminhar humano

---

## 11. Redis — Camadas de infraestrutura

### Stack Redis
- **Upstash Redis** (TLS, serverless) — mesmo provider do TypeScript
- Cliente: `redis[asyncio]` — nativo asyncio, compatível com FastAPI
- Reutilizar a instância Upstash já existente no projecto (bases de dados separadas por prefixo de key)

### Keys e TTLs

| Prefixo | Exemplo | TTL | Propósito |
|---------|---------|-----|-----------|
| `lock:conv:` | `lock:conv:cli-1:244923456789` | 8s | Lock de sessão por conversa |
| `dedup:msg:` | `dedup:msg:MSGID123` | 60s | Deduplicação de webhooks |
| `cache:esp:` | `cache:esp:cli-1` | 5min | Cache de especialidades |
| `cache:medicos:` | `cache:medicos:cli-1` | 5min | Cache de médicos activos |
| `ratelimit:wa:` | `ratelimit:wa:244923456789` | 60s | Rate limit por número |

### Estrutura de ficheiros (adicionados)

```
clinicaplus-intel/
├── lib/
│   ├── redis_client.py     # singleton Redis
│   ├── session_lock.py     # lock distribuído por conversa
│   ├── dedup.py            # deduplicação por messageId
│   ├── cache.py            # cache de especialidades e médicos
│   └── rate_limiter.py     # rate limit por número WhatsApp
├── jobs/
│   ├── scheduler.py        # APScheduler com 3 jobs
│   ├── expirar_conversas.py
│   ├── lembrete_proactivo.py
│   └── retrain_noshow.py
```

### Ordem de processamento por mensagem (completa)

```
POST /webhook/whatsapp
    ↓
0. Verificar HMAC
1. Resolver clinicaId por instanceName
2. Extrair número + texto/voto
3. [REDIS] Deduplicação por messageId   → ignorar se duplicado
4. [REDIS] Rate limit por número        → ignorar se >15/min
5. [REDIS] Adquirir session lock        → aguardar se outro thread a processar
    ↓ (dentro do lock)
6. Obter conversa da DB (estado DST)
7. [REDIS] Cache: especialidades + médicos
8. NLU → DST → Policy
9. [DB reads] Slots, paciente, histórico
10. Score no-show
11. Actualizar conversa na DB
12. Se CRIAR_AGENDAMENTO → TypeScript API
13. NLG → enviar Poll ou texto
    ↓
14. [REDIS] Liberar session lock
    ↓
return {"ok": True}
```
