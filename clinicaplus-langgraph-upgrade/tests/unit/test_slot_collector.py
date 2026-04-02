import pytest
from unittest.mock import patch, AsyncMock
from app.agent.nodes.slot_collector import slot_collector, check_slots_complete
from langchain_core.messages import AIMessage

@pytest.fixture
def mock_llm():
    with patch("app.agent.nodes.slot_collector.get_llm") as m:
        llm = AsyncMock()
        m.return_value = llm
        yield llm

@pytest.mark.asyncio
async def test_slot_collector_partial(mock_llm):
    mock_llm.ainvoke.return_value = AIMessage(content="Qual é a especialidade?")
    state = {
        "intent": "agendar",
        "collected_slots": {"date": "2026-05-01", "time": "10h", "confirmation": ""},
        "messages": []
    }
    res = await slot_collector(state)
    assert "specialty" in res["missing_slots"]
    assert "date" not in res["missing_slots"]
    assert "confirmation" in res["missing_slots"]
    
    state_after = {**state, **res}
    assert check_slots_complete(state_after) == "slot_collector"

def test_check_slots_complete_all_filled():
    state = {"missing_slots": []}
    assert check_slots_complete(state) == "action_executor"
