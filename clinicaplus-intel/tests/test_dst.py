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
    assert novo.erros == 2
    assert "INPUT_NAO_RECONHECIDO" in accoes

def test_urgencia_detectada_em_accoes():
    estado = DialogueState()
    nlu = make_nlu("URGENTE", urgente=True)
    _, accoes = tracker.actualizar(estado, nlu, {})
    assert "URGENCIA_DETECTADA" in accoes

def test_reset_solicitado_em_accoes():
    estado = DialogueState()
    nlu = make_nlu("RESET")
    _, accoes = tracker.actualizar(estado, nlu, {})
    assert "RESET_SOLICITADO" in accoes

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
