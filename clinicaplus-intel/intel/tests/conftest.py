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

    NOTA: _create_client foi removido em versões recentes do langchain-google-genai.
    Agora fazemos patch do atributo que inicializa o cliente interno.
    """
    # Patch do cliente interno do Google Generative AI - compatível com versões >= 2.x
    mock_client = MagicMock()
    monkeypatch.setattr(
        "langchain_google_genai.chat_models.ChatGoogleGenerativeAI.validate_environment",
        classmethod(lambda cls, values: values),
        raising=False,
    )
    yield mock_client


@pytest.fixture(autouse=True)
def mock_redis_connection():
    """
    Previne tentativas de ligação a Redis durante testes unitários.
    O grafo (graph.py) recebe o checkpointer injetado externamente (main.py),
    por isso mockamos a função init_graph para não precisar de Redis real.
    """
    mock_redis = MagicMock()
    mock_redis.get = MagicMock(return_value=None)
    mock_redis.set = MagicMock(return_value=True)
    mock_redis.pipeline = MagicMock(return_value=mock_redis)
    mock_redis.execute = MagicMock(return_value=[True, True])

    # O checkpointer é injetado em main.py via AsyncPostgresSaver.
    # Para testes, fazemos compile() sem checkpointer (comportamento de fallback do get_graph).
    with patch("intel.agent.graph.init_graph", return_value=None):
        yield mock_redis
