# intel/tests/test_agent.py
import pytest
import os
from unittest.mock import AsyncMock, patch, MagicMock
from langchain_core.messages import HumanMessage, AIMessage

# Mock das variáveis de ambiente necessárias para evitar erros no import
os.environ["GOOGLE_API_KEY"] = "AIza_mock_key"
os.environ["REDIS_URL"] = "redis://localhost:6379"
os.environ["TS_API_URL"] = "http://mock-api"
os.environ["TS_API_INTERNAL_KEY"] = "mock_key"

from intel.agent.state import ConversaState
from intel.config.models import build_llm, AGENT_MODELS, calcular_custo

# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def estado_base():
    return {
        "messages":           [],
        "clinica_id":         "cli-teste",
        "clinica_nome":       "Clínica Teste",
        "numero_wa":          "244923456789",
        "paciente_id":        "pac-001",
        "paciente_nome":      "João Silva",
        "next_agent":         None,
        "intencao":           None,
        "especialidade":      None,
        "medico_id":          None,
        "data_preferida":     None,
        "periodo":            None,
        "tokens_usados":      0,
        "custo_estimado_usd": 0.0,
        "turno":              0,
        "max_turnos":         10,
    }


# ── Testes de configuração ────────────────────────────────────────────────────

def test_build_llm_retorna_google_chat_model():
    """Verifica se a factory retorna o modelo Gemini configurado."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    llm = build_llm("intent")
    assert isinstance(llm, ChatGoogleGenerativeAI)
    # O SDK do Google prefixe internamente o nome com "models/"
    assert "gemini-1.5-flash" in llm.model

def test_calcular_custo_gemini_flash():
    """Valida o cálculo de custo para o Gemini 1.5 Flash."""
    # Preço: $0.075 input, $0.30 output por 1M
    custo = calcular_custo("gemini-1.5-flash", 1000000, 1000000)
    assert abs(custo - 0.375) < 0.0001

def test_grafo_compila_sem_erros():
    from intel.agent.graph import build_graph
    graph = build_graph()
    assert graph is not None


# ── Testes de nós individuais (Mocks) ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_intent_node_classifica_com_gemini(estado_base):
    from intel.agent.nodes.intent_agent import intent_node
    
    estado = {**estado_base, "messages": [HumanMessage(content="quero marcar consulta de cardio")]}

    # Patch do _llm dentro do módulo do nó
    with patch("intel.agent.nodes.intent_agent._llm") as mock_llm:
        mock_response = MagicMock()
        mock_response.content = '{"intencao": "marcar", "especialidade": "Cardiologia", "nome_medico": null, "data_preferida": null, "periodo": null}'
        mock_response.usage_metadata = {"input_tokens": 100, "output_tokens": 50}
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)

        resultado = await intent_node(estado)

    assert resultado["intencao"] == "marcar"
    assert resultado["especialidade"] == "Cardiologia"
    assert resultado["tokens_usados"] == 150
    assert resultado["custo_estimado_usd"] > 0


@pytest.mark.asyncio
async def test_supervisor_roteia_para_booking(estado_base):
    from intel.agent.nodes.supervisor import supervisor_node
    
    estado = {**estado_base, "intencao": "marcar", "turno": 1,
              "messages": [HumanMessage(content="quero marcar")]}

    with patch("intel.agent.nodes.supervisor._llm") as mock_llm:
        mock_response = MagicMock()
        mock_response.content = "booking"
        mock_response.usage_metadata = {"input_tokens": 200, "output_tokens": 10}
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)

        resultado = await supervisor_node(estado)

    assert resultado["next_agent"] == "booking"
    assert resultado["turno"] == 2


@pytest.mark.asyncio
async def test_info_node_responde_simpatico(estado_base):
    from intel.agent.nodes.info_agent import info_node
    
    estado = {**estado_base, "messages": [HumanMessage(content="onde ficam?")]}

    with patch("intel.agent.nodes.info_agent._llm") as mock_llm:
        mock_response = MagicMock()
        mock_response.content = "Ficamos na Rua Direita de Luanda. Como posso ajudar mais?"
        mock_response.usage_metadata = {"input_tokens": 100, "output_tokens": 20}
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)

        resultado = await info_node(estado)

    assert "Rua Direita" in resultado["messages"][0].content
    assert resultado["next_agent"] == "end"


# ── Testes de ferramentas ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_buscar_especialidades_isolamento_tenant():
    from intel.agent.tools.clinica_tools import buscar_especialidades
    import json

    with patch("intel.agent.tools.clinica_tools.db") as mock_db:
        mock_db.especialidades_activas = AsyncMock(return_value=["Ginecologia", "Urologia"])

        resultado = await buscar_especialidades.ainvoke({"clinica_id": "outra-clinica"})
        dados = json.loads(resultado)

    mock_db.especialidades_activas.assert_called_once_with("outra-clinica")
    assert "Urologia" in dados["especialidades"]
