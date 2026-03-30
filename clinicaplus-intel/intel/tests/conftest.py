# intel/tests/conftest.py
"""
Fixtures globais para suíte de testes do agente LangGraph.

OBJECTIVO: Evitar chamadas reais à API Google/Redis durante testes unitários.
Os mocks são aplicados automaticamente a TODOS os testes desta pasta.
"""
import os
import pytest
from unittest.mock import patch, MagicMock


# ── Variáveis de ambiente necessárias antes de qualquer import ─────────────────
# Garantir que estão definidas antes dos módulos carregarem
os.environ.setdefault("GOOGLE_API_KEY", "AIza-ci-mock-key-do-not-use")
os.environ.setdefault("REDIS_URL",       "redis://localhost:6379")
os.environ.setdefault("TS_API_URL",      "http://mock-api:3001")
os.environ.setdefault("TS_API_INTERNAL_KEY", "ci-internal-key")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-ci-mock")
os.environ.setdefault("OPENAI_API_KEY",  "sk-ci-mock")


@pytest.fixture(autouse=True)
def mock_llm_validation(monkeypatch):
    """
    Intercepta a validação da API key do Google no momento do import.
    Sem este mock, `build_llm()` faz uma chamada real de validação
    que demora ~30s por módulo importado.

    Resultado: testes correm em <5s em vez de ~5min.
    """
    # Patch do ChatGoogleGenerativeAI para não validar a key em __init__
    with patch("langchain_google_genai.ChatGoogleGenerativeAI._create_client", return_value=None):
        yield


@pytest.fixture(autouse=True)
def mock_redis_connection():
    """
    Previne tentativas de ligação a Redis durante testes unitários.
    Testes de integração devem fazer override desta fixture.
    """
    mock_redis = MagicMock()
    mock_redis.get = MagicMock(return_value=None)
    mock_redis.set = MagicMock(return_value=True)
    mock_redis.pipeline = MagicMock(return_value=mock_redis)
    mock_redis.execute = MagicMock(return_value=[True, True])

    with patch("intel.agent.graph.AsyncRedisSaver.from_conn_string", return_value=mock_redis):
        yield mock_redis
