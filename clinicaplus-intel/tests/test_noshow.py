import pytest
from noshow.heuristica import HeuristicaNoShow, SinaisRisco

def test_heuristica_paciente_novo_alto_risco():
    h = HeuristicaNoShow()
    # Lead time 40 dias (+0.20), primeira consulta (+0.10)
    sinais = SinaisRisco(lead_time_dias=40, primeira_consulta=True)
    res = h.calcular_score(sinais)
    
    assert res["score"] == pytest.approx(0.30)  # 0.20 + 0.10
    assert "Lead time > 30 (+0.20) | Primeira consulta (+0.10)" == res["raciocinio"]
    assert res["nivel"] == "BAIXO" # 0.30 é < 0.35
    assert res["enviar_segundo"] is False

def test_heuristica_historico_ruim():
    h = HeuristicaNoShow()
    # 100% no-show (*0.45), cancelamentos >= 3 (+0.12), hora as 7h (+0.10)
    sinais = SinaisRisco(taxa_noshow_historica=1.0, total_cancelamentos=4, hora_consulta=7)
    res = h.calcular_score(sinais)
    
    # score: 0.45 + 0.12 + 0.10 = 0.67
    assert res["score"] == 0.67
    assert res["nivel"] == "ALTO"
    assert res["enviar_segundo"] is True
    assert "Histórico" in res["raciocinio"]
    
def test_factores_protectores():
    h = HeuristicaNoShow()
    # Historico mau (0.5 * 0.45 = 0.225) + 30 dias lead time (+0.12) => 0.345
    # Respondeu lembrete (-0.25) => 0.095
    sinais = SinaisRisco(taxa_noshow_historica=0.5, lead_time_dias=20, respondeu_lembrete=True)
    res = h.calcular_score(sinais)
    
    assert res["score"] == 0.345 - 0.25
    assert res["nivel"] == "BAIXO"
    assert "Respondeu Lembrete (-0.25)" in res["raciocinio"]
