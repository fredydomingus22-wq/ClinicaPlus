# intel/tests/test_agent.py
# ── Suite de Testes Atualizada para a Arquitetura LangGraph atual ──────────────
import pytest
import os
from unittest.mock import AsyncMock, patch, MagicMock
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# Mock das variáveis de ambiente necessárias antes dos imports
os.environ.setdefault("GOOGLE_API_KEY", "AIza_mock_key")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("TS_API_URL", "http://mock-api")
os.environ.setdefault("TS_API_INTERNAL_KEY", "mock_key")
os.environ.setdefault("DATABASE_URL", "postgresql://mock:mock@localhost/mock")

# ── Fixture Base (alinhada com AgentState de intel/agent/state.py) ────────────

@pytest.fixture
def estado_base():
    """Estado base alinhado com AgentState (intel/agent/state.py)."""
    return {
        "messages":           [],
        "tenant_id":          "cli-teste-001",
        "whatsapp_number":    "244923456789",
        "patient_id":         "pac-001",
        "patient_name":       "João Silva",
        "clinic_config":      {"name": "Clínica Teste", "especialidades": ["Cardiologia", "Pediatria"]},
        "patient_data":       None,
        "llm_provider":       "google",
        "intent":             None,
        "collected_slots":    {},
        "missing_slots":      [],
        "requires_human":     False,
        "conversation_stage": "greeting",
        "turn_count":         0,
        "last_activity_ts":   "2026-04-04T21:00:00+01:00",
    }


# ── Testes de Infraestrutura ──────────────────────────────────────────────────

def test_grafo_compila_sem_erros():
    """Verifica que o grafo principal compila sem exceções."""
    from intel.agent.graph import builder
    graph = builder.compile()  # Compile sem checkpointer (modo de teste)
    assert graph is not None


def test_agent_state_schema_importa():
    """Verifica que o AgentState importa sem erros."""
    from intel.agent.state import AgentState
    assert AgentState is not None


# ── Testes do Intent Router ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_intent_router_classifica_marcacao(estado_base):
    """Verifica se o intent_router classifica corretamente 'agendar'."""
    from intel.agent.nodes.intent_router import intent_router

    estado = {
        **estado_base,
        "messages": [HumanMessage(content="quero marcar consulta de cardiologia")]
    }

    # O nó usa get_llm(provider) internamente — mockamos o provider
    mock_llm = MagicMock()
    mock_structured = MagicMock()
    mock_response = MagicMock()
    mock_response.model_dump.return_value = {
        "intent": "agendar",
        "confidence": 0.95,
        "extracted_slots": {"specialty": "Cardiologia"}
    }
    mock_structured.ainvoke = AsyncMock(return_value=mock_response)
    mock_llm.with_structured_output.return_value = mock_structured

    with patch("intel.agent.providers.get_llm", return_value=mock_llm):
        resultado = await intent_router(estado)

    assert resultado["intent"] == "agendar"
    assert resultado["collected_slots"].get("specialty") == "Cardiologia"
    assert resultado["turn_count"] == 1


@pytest.mark.asyncio
async def test_intent_router_classifica_faq(estado_base):
    """FAQ simples não deve ser classificado como 'agendar'."""
    from intel.agent.nodes.intent_router import intent_router

    estado = {
        **estado_base,
        "messages": [HumanMessage(content="onde ficam as vossas instalações?")]
    }

    mock_llm = MagicMock()
    mock_structured = MagicMock()
    mock_response = MagicMock()
    mock_response.model_dump.return_value = {
        "intent": "duvida",
        "confidence": 0.90,
        "extracted_slots": {}
    }
    mock_structured.ainvoke = AsyncMock(return_value=mock_response)
    mock_llm.with_structured_output.return_value = mock_structured

    with patch("intel.agent.providers.get_llm", return_value=mock_llm):
        resultado = await intent_router(estado)

    assert resultado["intent"] == "duvida"


@pytest.mark.asyncio
async def test_intent_router_fallback_em_erro(estado_base):
    """Quando o LLM falha, o nó deve retornar fallback='duvida' sem crashar."""
    from intel.agent.nodes.intent_router import intent_router

    estado = {
        **estado_base,
        "messages": [HumanMessage(content="quero marcar")]
    }

    with patch("intel.agent.providers.get_llm", side_effect=Exception("API timeout")):
        resultado = await intent_router(estado)

    # Fallback não deve crashar — volta 'duvida'
    assert resultado["intent"] == "duvida"
    assert "turn_count" in resultado


# ── Testes de Roteamento Condicional ─────────────────────────────────────────

def test_route_by_intent_booking(estado_base):
    """Intenção 'agendar' deve rotear para booking_manager."""
    from intel.agent.nodes.intent_router import route_by_intent
    estado = {**estado_base, "intent": "agendar"}
    assert route_by_intent(estado) == "booking_manager"


def test_route_by_intent_cancelar(estado_base):
    """Intenção 'cancelar' deve rotear para booking_manager."""
    from intel.agent.nodes.intent_router import route_by_intent
    estado = {**estado_base, "intent": "cancelar"}
    assert route_by_intent(estado) == "booking_manager"


def test_route_by_intent_faq(estado_base):
    """Intenção 'duvida' deve rotear para faq_responder."""
    from intel.agent.nodes.intent_router import route_by_intent
    estado = {**estado_base, "intent": "duvida"}
    assert route_by_intent(estado) == "faq_responder"


def test_route_by_intent_humano(estado_base):
    """Intenção 'humano' deve rotear para human_handoff."""
    from intel.agent.nodes.intent_router import route_by_intent
    estado = {**estado_base, "intent": "humano"}
    assert route_by_intent(estado) == "human_handoff"


# ── Testes de Ferramentas (Isolamento de Tenant via binder.py) ────────────────

def test_binder_tool_existe():
    """Verifica que build_tools_for_tenant pode ser importado e é callable."""
    from intel.agent.tools.binder import build_tools_for_tenant
    assert callable(build_tools_for_tenant)
