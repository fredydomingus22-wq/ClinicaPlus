import pytest
import hmac
import hashlib
import json
import asyncio
from dataclasses import asdict
from datetime import datetime, date, timedelta, timezone
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock
from main import app
from db.layer import ClinicaDB, Conversa, Medico, SlotDisponivel, LUANDA
from lib.evolution_client import EvolutionClient
from dst.tracker import DialogueState

def h(b, s): return hmac.new(s.encode(), b, hashlib.sha256).hexdigest()

@pytest.fixture
async def ac():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c: yield c

@pytest.fixture
def dbm():
    with patch("routers.webhook.db", spec=ClinicaDB) as m:
        m.resolver_ids_por_instancia = AsyncMock(return_value={"clinicaId":"c1","instanciaId":"i1"})
        m.is_ia_ativo = AsyncMock(return_value=True)
        m.especialidades_activas = AsyncMock(return_value=["Cardiologia"])
        m.todos_medicos_activos = AsyncMock(return_value=[])
        m.obter_conversa = AsyncMock()
        m.actualizar_conversa = AsyncMock()
        m.slots_por_regra = AsyncMock()
        m.nome_clinica = AsyncMock(return_value="Clinica Teste")
        yield m

@pytest.fixture
def evm():
    with patch("routers.webhook.evo_client", spec=EvolutionClient) as m:
        m.enviar_texto = AsyncMock()
        m.enviar_poll = AsyncMock()
        yield m

@pytest.fixture
def setup(monkeypatch):
    s = "sec"
    monkeypatch.setenv("EVOLUTION_WEBHOOK_SECRET", s)
    tasks = []
    def add(f,*a,**k): tasks.append((f,a,k))
    
    # Mocking external calls and cache to avoid loop issues
    with patch("routers.webhook.get_medicos_activos", AsyncMock(return_value=None)), \
         patch("routers.webhook.set_medicos_activos", AsyncMock()), \
         patch("routers.webhook.get_especialidades", AsyncMock(return_value=None)), \
         patch("routers.webhook.set_especialidades", AsyncMock()), \
         patch("routers.webhook.rate_limit_excedido", AsyncMock(return_value=False)), \
         patch("routers.webhook.ja_processado", AsyncMock(return_value=False)), \
         patch("routers.webhook.session_lock", MagicMock(return_value=AsyncMock())), \
         patch("routers.webhook.WEBHOOK_SECRET", s), \
         patch("routers.webhook.BackgroundTasks.add_task", side_effect=add):
        yield tasks

async def run_t(tasks):
    for f,a,k in tasks: await f(*a,**k)
    tasks.clear()

def s2c(e): return json.loads(json.dumps(asdict(e)))

@pytest.mark.asyncio
async def test_workflow_ok(ac, dbm, evm, setup):
    c, i, n, num, sec = "c1", "i1", "inst", "2449", "sec"
    dbm.todos_medicos_activos.return_value = [{"id":"m1","nome":"Dr. S","especialidade":"Cardiologia"}]

    async def p(payload):
        b = json.dumps(payload).encode()
        r = await ac.post("/webhook/whatsapp", content=b, headers={"x-evolution-hmac": h(b, sec)})
        assert r.status_code == 200
        await run_t(setup)
        return dbm.actualizar_conversa.call_args[0][3]

    # T1: Start
    dbm.obter_conversa.return_value = None
    st1 = await p({"event":"messages.upsert","instance":n,"data":{"messages":[{"key":{"remoteJid":f"{num}@s.net","fromMe":False,"id":"T1"},"message":{"conversation":"marcar"}}]}})
    evm.enviar_poll.assert_called_once()
    evm.enviar_poll.reset_mock()
    
    # T2: Specialty
    dbm.obter_conversa.return_value = Conversa(id="c",clinicaId=c,instanciaId=i,numeroWhatsapp=num,estado="A",contexto=s2c(st1),ultimaMensagemEm=datetime.now())
    st2 = await p({"event":"messages.update","instance":n,"data":[{"key":{"remoteJid":f"{num}@s.net","id":"T2"},"update":{"pollUpdates":[{"vote":{"selectedOptions":["Cardiologia"]}}]}}]})
    evm.enviar_poll.assert_called_once()
    evm.enviar_poll.reset_mock()
    
    # T3: Date -> Expect Poll if 2 slots
    dbm.obter_conversa.return_value = Conversa(id="c",clinicaId=c,instanciaId=i,numeroWhatsapp=num,estado="A",contexto=s2c(st2),ultimaMensagemEm=datetime.now())
    am = date.today() + timedelta(days=1)
    dbm.slots_por_regra.return_value = [
        SlotDisponivel(dataHora=datetime.combine(am, datetime.min.time()).replace(hour=9, tzinfo=LUANDA), medicoId="m1", medicoNome="Dr. S", preco=10),
        SlotDisponivel(dataHora=datetime.combine(am, datetime.min.time()).replace(hour=10, tzinfo=LUANDA), medicoId="m1", medicoNome="Dr. S", preco=10)
    ]
    st3 = await p({"event":"messages.update","instance":n,"data":[{"key":{"remoteJid":f"{num}@s.net","id":"T3"},"update":{"pollUpdates":[{"vote":{"selectedOptions":["Amanhã"]}}]}}]})
    assert evm.enviar_poll.called
    evm.enviar_poll.reset_mock()
    
    # T4: Slot -> Expect Confirmation Text
    dbm.obter_conversa.return_value = Conversa(id="c",clinicaId=c,instanciaId=i,numeroWhatsapp=num,estado="A",contexto=s2c(st3),ultimaMensagemEm=datetime.now())
    await p({"event":"messages.update","instance":n,"data":[{"key":{"remoteJid":f"{num}@s.net","id":"T4"},"update":{"pollUpdates":[{"vote":{"selectedOptions":["09:00"]}}]}}]})
    evm.enviar_texto.assert_called_once()

@pytest.mark.asyncio
async def test_urgencia(ac, dbm, evm, setup):
    dbm.resolver_ids_por_instancia.return_value = {"clinicaId":"c1","instanciaId":"i1"}
    dbm.obter_conversa.return_value = None
    b = json.dumps({"event":"messages.upsert","instance":"cli","data":{"messages":[{"key":{"remoteJid":"244@s.net","id":"U1"},"message":{"conversation":"URGENTE"}}]}}).encode()
    await ac.post("/webhook/whatsapp", content=b, headers={"x-evolution-hmac":h(b,"sec")})
    await run_t(setup)
    evm.enviar_texto.assert_called_once()
