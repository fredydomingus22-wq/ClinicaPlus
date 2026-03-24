import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from lib.evolution_client import EvolutionClient

@pytest.fixture
def override_env(monkeypatch):
    monkeypatch.setenv("EVOLUTION_API_URL", "http://fake-evo")
    monkeypatch.setenv("EVOLUTION_API_KEY", "fake-key")

@pytest.mark.asyncio
async def test_enviar_texto(override_env):
    client = EvolutionClient()
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        # Define mock response
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_post.return_value = mock_resp
        
        success = await client.enviar_texto("inst-1", "+244900000000", "Olá")
        assert success is True
        
        # Check call arguments
        mock_post.assert_called_once()
        args = mock_post.call_args
        assert "http://fake-evo/message/sendText/inst-1" == args[0][0]
        assert args[1]["json"]["number"] == "+244900000000"
        assert args[1]["json"]["text"] == "Olá"
        assert args[1]["headers"]["apikey"] == "fake-key"

@pytest.mark.asyncio
async def test_enviar_poll(override_env):
    client = EvolutionClient()
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_post.return_value = mock_resp
        
        opcoes = ["Cardiologia", "Pediatria"]
        success = await client.enviar_poll("inst-1", "+244900000000", "Qual?", opcoes)
        assert success is True
        
        # Check call arguments
        args = mock_post.call_args
        assert "http://fake-evo/message/sendPoll/inst-1" == args[0][0]
        payload = args[1]["json"]
        assert payload["name"] == "Qual?"
        assert payload["selectableCount"] == 1
        assert len(payload["options"]) == 2
        assert payload["options"][0]["optionName"] == "Cardiologia"
