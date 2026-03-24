# Reference: Redis — Cache, Locks de Sessão, Rate Limiting, Jobs

## Por que Redis no clinicaplus-intel

O Python FastAPI é stateless por design — cada request é independente. O Redis resolve 4 problemas:

| Problema | Solução Redis |
|----------|--------------|
| Duas mensagens simultâneas do mesmo número corrompem o DST | Lock de sessão com TTL |
| Especialidades/médicos buscados na DB a cada mensagem | Cache com TTL de 5 minutos |
| Evolution API reenvia o mesmo webhook 2-3x | Deduplicação por messageId |
| Rate limiting por número (paciente a spammar) | Counter com sliding window |

---

## 1. Setup — Redis client singleton

```python
# lib/redis_client.py

import os
import redis.asyncio as redis
from typing import Optional

_client: Optional[redis.Redis] = None

async def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(
            os.environ["REDIS_URL"],   # Upstash Redis URL
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=3.0,
            socket_connect_timeout=3.0,
        )
    return _client

async def close_redis():
    global _client
    if _client:
        await _client.aclose()
        _client = None
```

Adicionar ao `main.py` lifespan:
```python
from .lib.redis_client import get_redis, close_redis

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    await get_redis()   # ← warm up Redis connection
    yield
    await close_redis()
    await close_pool()
```

---

## 2. Lock de sessão — CRÍTICO para integridade do DST

**Problema:** paciente envia 2 mensagens em < 200ms → 2 requests correm em paralelo → lêem o mesmo estado → uma sobrescreve a outra.

**Solução:** distributed lock por `(clinicaId, numero)`. A segunda request aguarda até a primeira terminar.

```python
# lib/session_lock.py

import asyncio
from contextlib import asynccontextmanager
from .redis_client import get_redis

LOCK_TTL_MS   = 8_000   # 8 segundos — TTL do lock (liberta automaticamente se a request falhar)
LOCK_WAIT_MS  = 5_000   # 5 segundos — tempo máximo de espera para obter o lock
LOCK_RETRY_MS = 100     # 100ms — intervalo entre tentativas

@asynccontextmanager
async def session_lock(clinicaId: str, numero: str):
    """
    Lock distribuído por conversa.
    Garante que apenas 1 request processa uma conversa de cada vez.
    
    Uso:
        async with session_lock(clinicaId, numero):
            await _processar_mensagem(...)
    """
    r   = await get_redis()
    key = f"lock:conv:{clinicaId}:{numero}"

    # Tentar obter o lock
    acquired   = False
    waited_ms  = 0

    while waited_ms < LOCK_WAIT_MS:
        # SET key value NX PX ttl — atómico
        acquired = await r.set(key, "1", nx=True, px=LOCK_TTL_MS)
        if acquired:
            break
        await asyncio.sleep(LOCK_RETRY_MS / 1000)
        waited_ms += LOCK_RETRY_MS

    if not acquired:
        # Timeout a aguardar lock — provavelmente uma request presa
        # Forçar aquisição (a request anterior provavelmente falhou)
        await r.set(key, "1", px=LOCK_TTL_MS)

    try:
        yield
    finally:
        # Liberar lock
        await r.delete(key)
```

**Uso no webhook handler:**

```python
# routers/webhook.py

from ..lib.session_lock import session_lock

async def _processar_mensagem(clinicaId, instanceName, numero, texto, pushName):
    async with session_lock(clinicaId, numero):
        # Todo o pipeline aqui — garantidamente sequencial por conversa
        conversa = await db.obter_conversa(clinicaId, instanceName, numero)
        estado   = _deserializar_estado(conversa.contexto if conversa else {})
        # ... NLU → DST → Policy → DB → NLG → Evolution API
```

---

## 3. Deduplicação de webhooks

A Evolution API pode reenviar o mesmo webhook se não receber 200 dentro de 5 segundos. Sem deduplicação, o paciente recebe a mesma resposta duas vezes.

```python
# lib/dedup.py

from .redis_client import get_redis

DEDUP_TTL = 60  # segundos — janela de deduplicação

async def ja_processado(messageId: str) -> bool:
    """
    Verifica se este messageId já foi processado.
    Retorna True se for duplicado (ignorar), False se for novo.
    """
    r   = await get_redis()
    key = f"dedup:msg:{messageId}"
    # SET key 1 NX EX 60 — atómico: só marca se não existir
    novo = await r.set(key, "1", nx=True, ex=DEDUP_TTL)
    return not novo  # se não conseguiu fazer SET → já existia → é duplicado
```

**Uso no webhook handler:**

```python
# routers/webhook.py

from ..lib.dedup import ja_processado

@router.post("/webhook/whatsapp")
async def webhook_whatsapp(request: Request, ...):
    # ...
    if event == "messages.upsert":
        msg       = payload["data"]["messages"][0]
        messageId = msg["key"]["id"]

        # Ignorar duplicados
        if await ja_processado(messageId):
            return {"ok": True, "dedup": True}

        # ... processar normalmente
```

---

## 4. Cache de dados estáticos

Especialidades e médicos mudam raramente (quando o admin adiciona/remove um médico). Buscar na DB a cada mensagem é desperdício.

```python
# lib/cache.py

import json
from .redis_client import get_redis
from ..db.layer import db

CACHE_ESPECIALIDADES_TTL = 300   # 5 minutos
CACHE_MEDICOS_TTL        = 300   # 5 minutos

async def get_especialidades(clinicaId: str) -> list[str]:
    r   = await get_redis()
    key = f"cache:esp:{clinicaId}"

    cached = await r.get(key)
    if cached:
        return json.loads(cached)

    # Cache miss → buscar na DB
    especialidades = await db.especialidades_activas(clinicaId)
    await r.setex(key, CACHE_ESPECIALIDADES_TTL, json.dumps(especialidades))
    return especialidades


async def get_medicos_activos(clinicaId: str) -> list[dict]:
    r   = await get_redis()
    key = f"cache:medicos:{clinicaId}"

    cached = await r.get(key)
    if cached:
        return json.loads(cached)

    medicos = await db.todos_medicos_activos(clinicaId)
    medicos_serial = [{"id":m.id,"nome":m.nome,"especialidade":m.especialidade,"preco":m.preco} for m in medicos]
    await r.setex(key, CACHE_MEDICOS_TTL, json.dumps(medicos_serial))
    return medicos_serial


async def invalidar_cache_clinica(clinicaId: str):
    """
    Chamar quando o admin adiciona/remove um médico.
    O TypeScript API deve chamar este endpoint após qualquer alteração.
    """
    r = await get_redis()
    keys = await r.keys(f"cache:*:{clinicaId}")
    if keys:
        await r.delete(*keys)
```

**Endpoint de invalidação (chamar do TypeScript após alterar médicos):**

```python
# routers/admin.py

@router.post("/intel/cache/invalidar/{clinicaId}")
async def invalidar_cache(clinicaId: str, x_internal_key: str = Header(None)):
    if x_internal_key != os.environ["TS_API_INTERNAL_KEY"]:
        raise HTTPException(403)
    await invalidar_cache_clinica(clinicaId)
    return {"ok": True}
```

---

## 5. Rate limiting por número

Previne spam de mensagens e ataques de enumeração.

```python
# lib/rate_limiter.py

from .redis_client import get_redis

MAX_MSGS_POR_MINUTO = 15   # por número de WhatsApp
WINDOW_SECONDS      = 60

async def verificar_rate_limit(numero: str) -> bool:
    """
    Retorna True se o número está dentro do limite (processar normalmente).
    Retorna False se excedeu (ignorar a mensagem).
    """
    r   = await get_redis()
    key = f"ratelimit:wa:{numero}"

    count = await r.incr(key)
    if count == 1:
        await r.expire(key, WINDOW_SECONDS)  # apenas na primeira mensagem da janela

    return count <= MAX_MSGS_POR_MINUTO
```

**Uso:**

```python
# routers/webhook.py

from ..lib.rate_limiter import verificar_rate_limit

# Antes de processar
if not await verificar_rate_limit(numero):
    # Ignorar silenciosamente — não enviar mensagem de erro (evita feedback loop)
    return {"ok": True, "rate_limited": True}
```

---

## 6. Jobs assíncronos — APScheduler (sem n8n)

O Python roda os seus próprios jobs internos via APScheduler, sem depender do n8n para tarefas críticas.

```python
# jobs/scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from .expirar_conversas import job_expirar_conversas
from .lembrete_proactivo import job_lembretes_proactivos
from .retrain_noshow import job_retreino_semanal

scheduler = AsyncIOScheduler(timezone="Africa/Luanda")

def setup_jobs():
    # Expirar conversas sem actividade há 24h — todos os dias às 03:00
    scheduler.add_job(
        job_expirar_conversas,
        CronTrigger(hour=3, minute=0),
        id="expirar_conversas",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # Lembretes proactivos (48h antes sem confirmação) — todos os dias às 08:00
    scheduler.add_job(
        job_lembretes_proactivos,
        CronTrigger(hour=8, minute=0),
        id="lembretes_proactivos",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # Retreino do modelo de no-show — todas as segundas às 02:00
    scheduler.add_job(
        job_retreino_semanal,
        CronTrigger(day_of_week="mon", hour=2, minute=0),
        id="retreino_noshow",
        replace_existing=True,
    )

    scheduler.start()
```

Adicionar ao lifespan do `main.py`:
```python
from .jobs.scheduler import setup_jobs, scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    await get_redis()
    setup_jobs()
    yield
    scheduler.shutdown()
    await close_redis()
    await close_pool()
```

---

## 7. Job: expirar conversas inactivas

```python
# jobs/expirar_conversas.py

from ..db.pool import get_pool

async def job_expirar_conversas():
    """
    Marca como expiradas conversas sem actividade há 24h.
    O estado é preservado na DB — apenas o flag de expiração é actualizado.
    Na próxima mensagem do paciente, o sistema inicia uma nova sessão.
    """
    pool = await get_pool()
    async with pool.acquire() as c:
        resultado = await c.execute("""
            UPDATE wa_conversas
            SET
                estado    = 'EXPIRADA',
                contexto  = '{}',
                expira_em = NULL
            WHERE
                ultima_mensagem_em < NOW() - INTERVAL '24 hours'
                AND estado NOT IN ('EXPIRADA', 'CONCLUIDA')
        """)
    print(f"[job_expirar_conversas] {resultado}")
```

---

## 8. Job: lembretes proactivos

O intel inicia conversas de lembrete sem esperar que o paciente escreva.

```python
# jobs/lembrete_proactivo.py

from datetime import datetime, timedelta, timezone
from ..db.pool import get_pool
from ..lib.evolution_client import enviar_poll, enviar_texto

LUANDA_TZ = timezone(timedelta(hours=1))

async def job_lembretes_proactivos():
    """
    Envia lembrete proactivo a pacientes com consulta em 48h
    que ainda não confirmaram, sem esperar que escrevam.
    """
    pool = await get_pool()
    agora   = datetime.now(LUANDA_TZ)
    em_48h  = agora + timedelta(hours=48)
    em_24h  = agora + timedelta(hours=24)

    async with pool.acquire() as c:
        agendamentos = await c.fetch("""
            SELECT
                a.id, a.data_hora, a.clinica_id,
                p.telefone, p.nome AS paciente_nome,
                m.nome AS medico_nome, m.especialidade,
                wi.evolution_name AS instance_name
            FROM agendamentos a
            JOIN pacientes  p  ON p.id  = a.paciente_id
            JOIN medicos    m  ON m.id  = a.medico_id
            JOIN wa_instancias wi ON wi.clinica_id = a.clinica_id AND wi.estado = 'CONECTADO'
            WHERE
                a.data_hora BETWEEN $1 AND $2
                AND a.estado = 'CONFIRMADO'
                AND a.canal  = 'WHATSAPP'
                -- Só se ainda não recebeu lembrete
                AND NOT EXISTS (
                    SELECT 1 FROM wa_mensagens wm
                    JOIN wa_conversas wc ON wc.id = wm.conversa_id
                    WHERE wc.numero_whatsapp = p.telefone
                      AND wm.tipo = 'LEMBRETE_48H'
                      AND wm.criado_em > NOW() - INTERVAL '24 hours'
                )
        """, em_24h, em_48h)

    for ag in agendamentos:
        if not ag["telefone"]:
            continue

        numero = ag["telefone"].replace("+", "")
        data   = ag["data_hora"].astimezone(LUANDA_TZ)
        dias_pt = ["segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado","domingo"]
        label  = f"{dias_pt[data.weekday()]}, {data.day} de {data.month} às {data.strftime('%H:%M')}"

        msg = (
            f"Olá, {ag['paciente_nome'].split()[0]}! 👋\n\n"
            f"Lembrete: tens consulta com *{ag['medico_nome']}* ({ag['especialidade']})\n"
            f"📅 {label}\n\n"
            "Confirmas a presença?"
        )

        await enviar_texto(ag["instance_name"], numero, msg)
        await enviar_poll(
            ag["instance_name"], numero,
            "Vais comparecer?",
            ["✅ Sim, vou comparecer", "❌ Não posso ir", "🔄 Preciso remarcar"],
        )

        # Registar lembrete enviado
        async with pool.acquire() as c:
            await c.execute("""
                INSERT INTO wa_mensagens (conversa_id, clinica_id, direcao, tipo, conteudo, criado_em)
                SELECT wc.id, $1, 'SAIDA', 'LEMBRETE_48H', $2, NOW()
                FROM wa_conversas wc
                WHERE wc.clinica_id = $1
                  AND wc.numero_whatsapp = $3
                LIMIT 1
            """, ag["clinica_id"], msg[:100], numero)
```

---

## 9. Variáveis de ambiente adicionais

```env
# Adicionar ao .env do clinicaplus-intel
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6380   # Upstash Redis (TLS)
```

---

## 10. requirements.txt — adicionar

```
redis[asyncio]==5.0.1       # cliente asyncio para Redis
apscheduler==3.10.4         # scheduler de jobs interno
```

---

## Ordem de execução no handler — completa com todas as camadas

```python
async def _processar_mensagem(clinicaId, instanceName, numero, texto, pushName, messageId):

    # 0. Deduplicação — antes de tudo
    if await ja_processado(messageId):
        return

    # 1. Rate limiting
    if not await verificar_rate_limit(numero):
        return

    # 2. Lock de sessão — garante sequencialidade por conversa
    async with session_lock(clinicaId, numero):

        # 3. Obter estado da conversa (DB)
        conversa = await db.obter_conversa(clinicaId, instanceName, numero)
        estado   = _deserializar_estado(conversa.contexto if conversa else {})

        # 4. Cache: especialidades e médicos (Redis, TTL 5min)
        especialidades = await get_especialidades(clinicaId)
        medicos_todos  = await get_medicos_activos(clinicaId)

        # 5-15. NLU → DST → Policy → DB → NLG → Evolution API
        # (pipeline inalterado)
```
