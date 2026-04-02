import pytest
from app.agent.nodes.tenant_loader import tenant_loader
from app.agent.state import AgentState
from langchain_core.messages import SystemMessage

@pytest.mark.asyncio
async def test_tenant_loader_new_thread():
    # Sem config no state -> mock carrega da "DB" local
    state = {
        "tenant_id": "clinic_test",
        "messages": []
    }
    result = await tenant_loader(state)
    assert "clinic_config" in result
    assert "messages" in result
    assert isinstance(result["messages"][0], SystemMessage)
    # Verifica que o tenant_id "clinic_test" não está no system prompt default (se gerado via config local)
    prompt_text = result["messages"][0].content
    assert "clinic_test" not in prompt_text

@pytest.mark.asyncio
async def test_tenant_loader_existing_thread():
    # Já tem config - não recarrega formatação complexa nem re-insere SystemMessage
    sys_msg = SystemMessage(content="Existing system")
    state = {
        "tenant_id": "clinic_test",
        "clinic_config": {"name": "Clínica Teste"},
        "messages": [sys_msg]
    }
    result = await tenant_loader(state)
    assert "messages" not in result # porque já tem has_system 
    assert result["clinic_config"]["name"] == "Clínica Teste"
    assert "last_activity_ts" in result
