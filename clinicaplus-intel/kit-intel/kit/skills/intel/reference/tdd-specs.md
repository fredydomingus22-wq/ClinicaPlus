# Reference: TDD Specs — clinicaplus-intel

Implementar todos os testes ANTES do código de produção (ciclo RED→GREEN→REFACTOR).
Cobertura mínima: 85% em todos os módulos.

---

## tests/test_nlu.py — 26 casos

```python
import pytest
from nlu.pipeline import analisar

# ── Intenções básicas ──────────────────────────────────────────────────────────
def test_intencao_marcar_explicito():
    r = analisar("quero marcar uma consulta")
    assert r.intencao == "MARCAR"

def test_intencao_urgente():
    r = analisar("tenho dor no peito urgente")
    assert r.intencao == "URGENTE"
    assert r.urgente is True

def test_intencao_afirmacao():
    assert analisar("sim").intencao == "AFIRMACAO"
    assert analisar("vá").intencao == "AFIRMACAO"
    assert analisar("tá").intencao == "AFIRMACAO"
    assert analisar("ok").intencao == "AFIRMACAO"

def test_intencao_negacao():
    assert analisar("não").intencao == "NEGACAO"
    assert analisar("nao").intencao == "NEGACAO"

def test_intencao_cancelar():
    assert analisar("quero cancelar a minha consulta").intencao == "CANCELAR"
    assert analisar("preciso desmarcar").intencao == "CANCELAR"

def test_intencao_reagendar():
    assert analisar("preciso remarcar para a semana que vem").intencao == "REAGENDAR"

def test_intencao_reset():
    assert analisar("oi").intencao == "RESET"
    assert analisar("olá").intencao == "RESET"

# ── Especialidades (aliases pt-AO) ─────────────────────────────────────────────
def test_alias_cardio():
    assert analisar("quero marcar cardio").especialidade == "Cardiologia"

def test_alias_coracao():
    assert analisar("quero marcar pro coração").especialidade == "Cardiologia"

def test_alias_crianca():
    assert analisar("consulta de criança").especialidade == "Pediatria"

def test_alias_joelho():
    assert analisar("tenho problema no joelho").especialidade == "Ortopedia"

def test_alias_coluna():
    assert analisar("tenho dores na coluna").especialidade == "Ortopedia"

def test_alias_pele():
    assert analisar("quero consulta de pele").especialidade == "Dermatologia"

# ── O caso concreto ────────────────────────────────────────────────────────────
def test_caso_concreto_cardio_amanha():
    r = analisar("quero marcar consulta de cardio para amanhã")
    assert r.intencao == "MARCAR"
    assert r.especialidade == "Cardiologia"
    assert r.data_iso is not None
    assert r.data_iso > __import__("datetime").date.today().isoformat()

# ── Datas ──────────────────────────────────────────────────────────────────────
def test_data_amanha():
    from datetime import date, timedelta
    r = analisar("quero marcar para amanhã")
    assert r.data_iso == (date.today() + timedelta(days=1)).isoformat()

def test_data_quinta():
    r = analisar("quero a dra ana para quinta")
    assert r.data_iso is not None
    from datetime import date
    d = date.fromisoformat(r.data_iso)
    assert d.weekday() == 3  # quinta-feira

def test_data_semana_que_vem():
    from datetime import date, timedelta
    r = analisar("preciso remarcar para a semana que vem")
    assert r.data_iso is not None
    d = date.fromisoformat(r.data_iso)
    assert d >= date.today() + timedelta(days=7)

# ── Período ────────────────────────────────────────────────────────────────────
def test_periodo_tarde_nao_confunde_amanha():
    """'amanhã de tarde' não deve extrair 'manhã' dentro de 'amanhã'"""
    r = analisar("marcar para amanhã de tarde")
    assert r.periodo is not None
    assert r.periodo["label"] == "tarde"
    assert r.data_iso is not None  # amanhã também extraído

def test_periodo_manha():
    r = analisar("quero de manhã")
    assert r.periodo["inicio"] == 7
    assert r.periodo["fim"] == 12

def test_periodo_cedo():
    r = analisar("quero cardio amanhã cedo")
    assert r.periodo["inicio"] == 7
    assert r.periodo["fim"] == 10

# ── Sem slots espúrios ─────────────────────────────────────────────────────────
def test_sem_slots_em_afirmacao():
    r = analisar("sim")
    assert r.especialidade is None
    assert r.medico_id is None
    assert r.data_iso is None

def test_sem_slots_em_negacao():
    r = analisar("não")
    assert r.especialidade is None

def test_sem_slots_em_reset():
    r = analisar("oi")
    assert r.especialidade is None

# ── Médico ─────────────────────────────────────────────────────────────────────
MEDICOS_TESTE = [
    {"id":"med-1","nome":"Dr. Carlos Mendes","especialidade":"Cardiologia"},
    {"id":"med-2","nome":"Dra. Ana Costa","especialidade":"Pediatria"},
]

def test_medico_pelo_nome(medicos=MEDICOS_TESTE):
    r = analisar("quero a dra ana para quinta", medicos=medicos)
    assert r.medico_id == "med-2"
    assert r.especialidade == "Pediatria"  # inferida do médico

def test_medico_sem_sinal_nao_extrai(medicos=MEDICOS_TESTE):
    """Sem 'dr/dra' → não tentar match de médico"""
    r = analisar("quero marcar cardiologia", medicos=medicos)
    assert r.medico_id is None

# ── Urgência respeita especialidade ───────────────────────────────────────────
def test_urgencia_pediatria():
    r = analisar("minha filha tem febre alta preciso de médico")
    assert r.intencao == "URGENTE"
    assert r.especialidade == "Pediatria"

# ── Respostas a Polls ──────────────────────────────────────────────────────────
def test_poll_especialidade(esp_lista=["Cardiologia","Pediatria"]):
    r = analisar("Cardiologia", especialidades=esp_lista)
    assert r.especialidade == "Cardiologia"

def test_poll_medico(medicos=MEDICOS_TESTE):
    r = analisar("Dr. Carlos Mendes", medicos=medicos)
    assert r.medico_id == "med-1"
```

---

## tests/test_dst.py — 12 casos

```python
import pytest
from dst.tracker import DialogueStateTracker, DialogueState
from nlu.pipeline import NLUResult

tracker = DialogueStateTracker()

def make_nlu(intencao, esp=None, data=None, periodo=None, medico_id=None, urgente=False):
    return NLUResult(
        intencao=intencao, conf=0.9,
        especialidade=esp, medico_id=medico_id,
        data_iso=data, periodo=periodo, urgente=urgente,
    )

def test_merge_slot_especialidade():
    estado = DialogueState()
    nlu = make_nlu("MARCAR", esp="Cardiologia")
    novo_estado, accoes = tracker.actualizar(estado, nlu, {})
    assert novo_estado.especialidade == "Cardiologia"
    assert "SLOT_ESPECIALIDADE_PREENCHIDO" in accoes

def test_slots_nao_retrocedem():
    """Slot preenchido não pode ser sobrescrito por None"""
    estado = DialogueState(especialidade="Cardiologia")
    nlu = make_nlu("MARCAR", esp=None)
    novo, _ = tracker.actualizar(estado, nlu, {})
    assert novo.especialidade == "Cardiologia"

def test_contador_erros_reset_com_progresso():
    estado = DialogueState(erros=2)
    nlu = make_nlu("MARCAR", esp="Pediatria")
    novo, _ = tracker.actualizar(estado, nlu, {})
    assert novo.erros == 0  # progresso → reset

def test_contador_erros_incrementa_sem_progresso():
    estado = DialogueState(erros=1)
    nlu = make_nlu("DESCONHECIDO")
    nlu.intencao = "MARCAR"
    nlu.especialidade = None
    nlu.data_iso = None
    novo, accoes = tracker.actualizar(estado, nlu, {})
    assert "INPUT_NAO_RECONHECIDO" in accoes

def test_urgencia_detectada_em_accoes():
    estado = DialogueState()
    nlu = make_nlu("URGENTE", urgente=True)
    _, accoes = tracker.actualizar(estado, nlu, {})
    assert "URGENCIA_DETECTADA" in accoes

def test_numero_como_accao():
    estado = DialogueState()
    nlu = make_nlu("NUMERO")
    nlu.numero = 2
    _, accoes = tracker.actualizar(estado, nlu, {})
    assert "NUMERO_RECEBIDO:2" in accoes

def test_proximo_slot_em_falta_ordem():
    """Ordem correta: especialidade → data → slotHorario"""
    e = DialogueState()
    assert e.proximo_slot_em_falta() == "especialidade"
    e.especialidade = "Cardiologia"
    assert e.proximo_slot_em_falta() == "data"
    e.data_iso = "2026-03-25"
    assert e.proximo_slot_em_falta() == "slotHorario"
    e.slotHorario = "2026-03-25T09:00:00"
    assert e.esta_completo() is True
```

---

## tests/test_policy.py — 10 casos

```python
import pytest
from policy.dialogue_policy import DialoguePolicy, PolicyDecision
from dst.tracker import DialogueState

policy = DialoguePolicy()

def make_estado(**kwargs):
    return DialogueState(**kwargs)

def make_opcoes(slots=None, medicos=None, especialidades=None):
    return {
        "slots": slots or [],
        "medicos": medicos or [],
        "especialidades": especialidades or ["Cardiologia","Pediatria"],
    }

def test_urgencia_prioridade_maxima():
    estado = make_estado()
    decisao = policy.decidir(estado, ["URGENCIA_DETECTADA"], None, make_opcoes())
    assert decisao.accao == "URGENCIA"

def test_ajuda_encaminha_humano():
    estado = make_estado()
    decisao = policy.decidir(estado, ["AJUDA_SOLICITADA"], None, make_opcoes())
    assert decisao.accao == "ENCAMINHAR_HUMANO"

def test_4_erros_encaminha_humano():
    estado = make_estado(erros=4)
    decisao = policy.decidir(estado, [], None, make_opcoes())
    assert decisao.accao == "ENCAMINHAR_HUMANO"

def test_confirmacao_afirmativa_cria_agendamento():
    estado = make_estado(
        especialidade="Cardiologia", medicoId="med-1",
        data_iso="2026-03-25", slotHorario="2026-03-25T09:00:00",
        ultimaAccao="AGUARDA_CONFIRMACAO",
    )
    decisao = policy.decidir(estado, ["CONFIRMACAO:AFIRMACAO"], None, make_opcoes())
    assert decisao.accao == "CRIAR_AGENDAMENTO"

def test_sem_slots_retorna_alternativas():
    estado = make_estado(especialidade="Cardiologia", medicoId="med-1", data_iso="2026-03-25")
    opcoes = make_opcoes(slots=[])  # sem slots disponíveis
    decisao = policy.decidir(estado, [], None, opcoes)
    assert decisao.accao == "ALTERNATIVAS"

def test_1_slot_confirma_directo():
    """Um único slot → saltar Poll de escolha e pedir confirmação directa"""
    from datetime import datetime, timezone, timedelta
    slot_mock = type("S", (), {"dataHora": datetime(2026,3,25,9,0, tzinfo=timezone(timedelta(hours=1))), "medicoId":"med-1","medicoNome":"Dr. Carlos","preco":3000})()
    estado = make_estado(especialidade="Cardiologia", medicoId="med-1", data_iso="2026-03-25")
    opcoes = make_opcoes(slots=[slot_mock])
    decisao = policy.decidir(estado, [], None, opcoes)
    assert decisao.accao == "CONFIRMAR"

def test_falta_especialidade_pede_poll():
    estado = make_estado()
    decisao = policy.decidir(estado, [], None, make_opcoes())
    assert decisao.accao == "MOSTRAR_OPCOES"
    assert decisao.slot_alvo == "especialidade"
```

---

## tests/test_db_layer.py — 8 casos (com mocks asyncpg)

```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from db.layer import ClinicaDB, WaFormatter, SlotDisponivel, Medico
from datetime import datetime, timezone, timedelta

LUANDA = timezone(timedelta(hours=1))

@pytest.fixture
def db():
    return ClinicaDB()

@pytest.mark.asyncio
async def test_medicos_filtra_por_clinica(db):
    mock_row = {"id":"med-1","nome":"Dr. Carlos","especialidade":"Cardiologia",
                "preco":3000,"ativo":True,"clinica_id":"cli-1"}
    with patch("db.layer.conn") as mock_conn:
        mock_conn.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
            fetch=AsyncMock(return_value=[mock_row])
        ))
        medicos = await db.medicos_por_especialidade("cli-1", "Cardiologia")
    assert len(medicos) == 1
    assert medicos[0].nome == "Dr. Carlos"
    assert medicos[0].clinicaId == "cli-1"

@pytest.mark.asyncio
async def test_paciente_por_telefone_retorna_none_se_nao_existe(db):
    with patch("db.layer.conn") as mock_conn:
        mock_conn.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
            fetchrow=AsyncMock(return_value=None)
        ))
        p = await db.paciente_por_telefone("cli-1", "+244900000000")
    assert p is None

@pytest.mark.asyncio
async def test_stats_no_show_retorna_zeros_para_novo_paciente(db):
    mock_row = {"total":0,"no_shows":0,"cancelamentos":0,"ultima_concluida":None}
    with patch("db.layer.conn") as mock_conn:
        mock_conn.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
            fetchrow=AsyncMock(return_value=mock_row)
        ))
        stats = await db.stats_no_show_paciente("cli-1", "pac-1")
    assert stats["taxa_no_show"] == 0.0
    assert stats["total"] == 0

def test_formatter_slots_como_poll():
    slots = [SlotDisponivel(
        dataHora=datetime(2026,3,25,9,0,tzinfo=LUANDA),
        medicoId="med-1", medicoNome="Dr. Carlos", preco=3000,
    )]
    poll = WaFormatter.slots_como_poll(slots)
    assert "pergunta" in poll
    assert len(poll["opcoes"]) == 1
    assert "Dr. Carlos" not in poll["opcoes"][0]  # poll não mostra médico, só horário
    assert "09:00" in poll["opcoes"][0]

def test_formatter_confirmacao_agendamento():
    from db.layer import Agendamento
    ag = Agendamento(
        id="ag-1", dataHora=datetime(2026,3,25,9,0,tzinfo=LUANDA),
        estado="CONFIRMADO", canal="WHATSAPP",
        medicoNome="Dr. Carlos", medicoEsp="Cardiologia",
        pacienteNome="João Silva", clinicaId="cli-1",
    )
    msg = WaFormatter.confirmacao_agendamento(ag)
    assert "✅" in msg
    assert "Dr. Carlos" in msg
    assert "09:00" in msg
```

---

## Comandos de execução

```bash
# Instalar dependências de teste
pip install pytest pytest-asyncio pytest-cov

# Correr todos os testes com cobertura
pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=85

# Correr módulo específico
pytest tests/test_nlu.py -v

# Correr um teste específico
pytest tests/test_nlu.py::test_caso_concreto_cardio_amanha -v

# Modo watch (durante desenvolvimento)
pytest tests/ --tb=short -q --no-header
```

## pytest.ini

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```
