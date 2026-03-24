import pytest
from nlg.generator import NLGGenerator

generator = NLGGenerator()

def test_nlg_boas_vindas():
    msg = generator.gerar_resposta("boas_vindas", {"push_name": "João"})
    assert "Olá João!" in msg
    assert "ClínicaPlus" in msg

def test_nlg_urgencia():
    msg = generator.gerar_resposta("urgencia", {"especialidade": "Pediatria"})
    assert "🚨" in msg
    assert "Pediatria" in msg
    assert "urgência" in msg

def test_nlg_humano():
    msg = generator.gerar_resposta("humano", {})
    assert "humana" in msg
    assert "transferir" in msg

def test_nlg_poll_especialidades():
    pergunta, opcoes = generator.get_opcoes_poll("lista_especialidades", {"opcoes": ["Cardiologia", "Pediatria"]})
    assert "especialidade" in pergunta
    assert "Cardiologia" in opcoes
    assert len(opcoes) == 2
