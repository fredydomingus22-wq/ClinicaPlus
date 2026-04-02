import pytest
import json
from unittest.mock import patch, AsyncMock
from app.agent.nodes.intent_router import intent_router
from langchain_core.messages import AIMessage, HumanMessage

@pytest.fixture
def mock_llm():
    with patch("app.agent.nodes.intent_router.get_llm") as mock_auth:
        llm = AsyncMock()
        mock_auth.return_value = llm
        yield llm

@pytest.mark.asyncio
async def test_intent_router_agendar(mock_llm):
    mock_llm.ainvoke.return_value = AIMessage(content=json.dumps({
        "intent": "agendar",
        "confidence": 0.9,
        "extracted_slots": {"specialty": "clínica geral"}
    }))
    state = {
        "messages": [HumanMessage(content="quero marcar clínica geral")],
        "turn_count": 0,
        "collected_slots": {}
    }
    res = await intent_router(state)
    assert res["intent"] == "agendar"
    assert res["collected_slots"]["specialty"] == "clínica geral"
    assert res["turn_count"] == 1

@pytest.mark.asyncio
async def test_intent_router_invalid_json(mock_llm):
    # Simular modelo gerando texto livre sem JSON
    mock_llm.ainvoke.return_value = AIMessage(content="Isso parece uma dúvida médica.")
    state = {"messages": [HumanMessage(content="tenho dores")], "turn_count": 0}
    res = await intent_router(state)
    assert res["intent"] == "duvida"

@pytest.mark.asyncio
async def test_intent_router_max_turns(mock_llm):
    # Se turnos atingirem o máximo, escala para humano logo
    state = {"messages": [HumanMessage(content="não percebes!")], "turn_count": 10}
    res = await intent_router(state)
    assert res["intent"] == "humano"
    assert res["turn_count"] == 11
    # Assegurar que LLM não foi sequer chamado
    mock_llm.ainvoke.assert_not_called()
