import pytest
from nlu.pipeline import analisar, NLUResult

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
