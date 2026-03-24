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
    # Mock slot object
    class SlotMock:
        def __init__(self):
            self.dataHora = datetime(2026,3,25,9,0, tzinfo=timezone(timedelta(hours=1)))
            self.medicoId = "med-1"
            self.medicoNome = "Dr. Carlos"
            self.preco = 3000
        
        def to_iso(self): return self.dataHora.isoformat()

    slot_mock = SlotMock()
    estado = make_estado(especialidade="Cardiologia", medicoId="med-1", data_iso="2026-03-25")
    opcoes = make_opcoes(slots=[slot_mock])
    decisao = policy.decidir(estado, [], None, opcoes)
    assert decisao.accao == "CONFIRMAR"

def test_falta_especialidade_pede_poll():
    estado = make_estado()
    decisao = policy.decidir(estado, [], None, make_opcoes())
    assert decisao.accao == "MOSTRAR_OPCOES"
    assert decisao.slot_alvo == "especialidade"
