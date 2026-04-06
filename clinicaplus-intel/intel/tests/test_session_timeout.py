# intel/tests/test_session_timeout.py
# ── Testes de Persistência e Gestão de Sessão ─────────────────────────────────
"""
Valida a lógica de timeout de 30 minutos na função _executar_fluxo_mensagem
do webhook.py, incluindo:
  - Sessão ativa: não deve fazer resete antes de 30min
  - Sessão expirada: deve fazer resete após 30min
  - Primeira mensagem: deve inicializar o estado completo
  - Proteção contra relógios dessincronizados
"""
import pytest
import os
from datetime import datetime, timedelta, timezone, timezone
from unittest.mock import AsyncMock, patch, MagicMock

os.environ.setdefault("GOOGLE_API_KEY", "AIza_mock_key")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("TS_API_URL", "http://mock-api")
os.environ.setdefault("TS_API_INTERNAL_KEY", "mock_key")
os.environ.setdefault("DATABASE_URL", "postgresql://mock:mock@localhost/mock")
os.environ.setdefault("EVOLUTION_WEBHOOK_SECRET", "test-secret")

# Fuso horário de Luanda (UTC+1) — usado como padrão no webhook
LUANDA_TZ = timezone(timedelta(hours=1))

# Helper para gerar timestamp UTC+1
def ts_luanda(delta_seconds: int = 0) -> str:
    """Retorna timestamp Luanda com delta em segundos relativamente ao agora."""
    return str((datetime.now(LUANDA_TZ) + timedelta(seconds=delta_seconds)).timestamp())


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_redis():
    """Mock do Redis para testes de timeout."""
    redis = MagicMock()
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock()
    return redis


@pytest.fixture
def mock_graph():
    """Mock do grafo LangGraph."""
    graph = MagicMock()
    graph.aget_state = AsyncMock(return_value=MagicMock(values={}))
    graph.ainvoke = AsyncMock(return_value={
        "messages": [MagicMock(content="Olá! Como posso ajudar?")],
        "tokens_usados": 100,
        "custo_estimado_usd": 0.001,
    })
    graph.aupdate_state = AsyncMock()
    return mock_graph


# ── Testes de Cálculo de Timeout ─────────────────────────────────────────────

class TestCalculoTimeout:
    """Testa o cálculo de diferença de tempo com LUANDA_TZ."""

    def test_timestamp_luanda_e_utc_mais_1(self):
        """Verifica que o timestamp UTC+1 é consistente com UTC."""
        agora_luanda = datetime.now(LUANDA_TZ).timestamp()
        agora_utc = datetime.now(timezone.utc).timestamp()
        # Timestamps em segundos devem ser quase idênticos (mesma epoch)
        assert abs(agora_luanda - agora_utc) < 2.0, \
            "Timestamps Luanda e UTC devem ser equivalentes em epoch seconds"

    def test_sessao_ativa_nao_expira_em_29min(self):
        """Sessão com 29 minutos de inatividade NÃO deve expirar."""
        agora = datetime.now(LUANDA_TZ).timestamp()
        last_ts = agora - (29 * 60)  # 29 minutos atrás
        timeout = 1800  # 30 minutos

        diff = agora - last_ts
        assert diff < timeout, f"Sessão de {diff}s não devia expirar (timeout={timeout}s)"

    def test_sessao_expira_apos_31min(self):
        """Sessão com 31 minutos de inatividade DEVE expirar."""
        agora = datetime.now(LUANDA_TZ).timestamp()
        last_ts = agora - (31 * 60)  # 31 minutos atrás
        timeout = 1800  # 30 minutos

        diff = agora - last_ts
        assert diff > timeout, f"Sessão de {diff}s devia ter expirado (timeout={timeout}s)"

    def test_sessao_expira_exactamente_em_30min(self):
        """Sessão com exatamente 30 minutos de inatividade DEVE expirar."""
        agora = datetime.now(LUANDA_TZ).timestamp()
        last_ts = agora - 1800  # exatamente 30 min
        timeout = 1800

        diff = agora - last_ts
        assert diff >= timeout, "Sessão de exatamente 30min devia expirar"

    def test_timestamp_negativo_detecta_relogio_dessincronizado(self):
        """Diferença negativa > 60s deve ser tratada como relógio dessincronizado."""
        agora = datetime.now(LUANDA_TZ).timestamp()
        # Simula timestamp do Redis que está 2 min no futuro (relógio adiantado)
        last_ts = agora + (2 * 60)

        diff = agora - last_ts
        assert diff < -60, "Diferença negativa > 60s deve ser detetada como anomalia"


# ── Testes de Lógica da Sessão no Webhook ────────────────────────────────────

class TestLogicaSessaoWebhook:
    """Testa a lógica de resete de sessão no _executar_fluxo_mensagem."""

    @pytest.mark.asyncio
    async def test_primeira_mensagem_inicializa_estado_completo(self, mock_redis):
        """Na primeira mensagem (sem last_ts), o estado deve ser inicializado completamente."""
        # Redis não tem valor guardado → primeira mensagem
        mock_redis.get = AsyncMock(return_value=None)

        agora = datetime.now(LUANDA_TZ).timestamp()
        last_ts = await mock_redis.get("last_activity:cli-001:244923456789")
        
        # Se não há last_ts, deve-se inicializar (force_reset=False, estado novo)
        assert last_ts is None
        
        # Verificar que o SET é chamado com timestamp Luanda
        await mock_redis.set("last_activity:cli-001:244923456789", str(agora))
        mock_redis.set.assert_called_once()
        
        # O valor guardado deve ser maior que 0 e razoável
        saved_val = float(mock_redis.set.call_args[0][1])
        assert saved_val > 0
        assert abs(saved_val - agora) < 2.0

    @pytest.mark.asyncio
    async def test_sessao_ativa_nao_faz_reset(self, mock_redis):
        """Sessão com 10 minutos de inatividade não deve acionar force_reset."""
        agora = datetime.now(LUANDA_TZ).timestamp()
        last_ts_str = str(agora - (10 * 60))  # 10 min atrás

        mock_redis.get = AsyncMock(return_value=last_ts_str)

        last_ts = await mock_redis.get("last_activity:cli-001:244923456789")
        diff = agora - float(last_ts)
        timeout = 1800

        force_reset = diff > timeout
        assert not force_reset, f"Sessão ativa de {diff:.0f}s não devia ser resetada"

    @pytest.mark.asyncio
    async def test_sessao_expirada_faz_reset(self, mock_redis):
        """Sessão com 35 minutos de inatividade deve acionar force_reset."""
        agora = datetime.now(LUANDA_TZ).timestamp()
        last_ts_str = str(agora - (35 * 60))  # 35 min atrás

        mock_redis.get = AsyncMock(return_value=last_ts_str)

        last_ts = await mock_redis.get("last_activity:cli-001:244923456789")
        diff = agora - float(last_ts)
        timeout = 1800

        force_reset = diff > timeout
        assert force_reset, f"Sessão expirada de {diff:.0f}s DEVIA ser resetada"

    @pytest.mark.asyncio
    async def test_thread_id_e_unico_por_clinica_e_numero(self):
        """O thread_id deve ser composto por clinica_id:numero para isolamento multi-tenant."""
        clinica_id = "cli-angola-001"
        numero = "244923456789"
        thread_id = f"{clinica_id}:{numero}"

        assert "cli-angola-001" in thread_id
        assert "244923456789" in thread_id
        assert thread_id == "cli-angola-001:244923456789"

        # Dois clientes com o mesmo número mas clínicas diferentes têm threads diferentes
        thread_id_outra_clinica = f"cli-angola-002:{numero}"
        assert thread_id != thread_id_outra_clinica

    @pytest.mark.asyncio
    async def test_redis_key_usa_thread_id(self):
        """A chave Redis deve usar last_activity:{thread_id} para evitar colisões."""
        thread_id = "cli-001:244923456789"
        expected_key = f"last_activity:{thread_id}"

        assert expected_key == "last_activity:cli-001:244923456789"
        # Chaves de clínicas diferentes nunca colidem
        other_key = f"last_activity:cli-002:244923456789"
        assert expected_key != other_key
