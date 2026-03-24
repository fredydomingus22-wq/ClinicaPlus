import pytest
import asyncio
import json
from unittest.mock import patch, MagicMock, AsyncMock
from lib.redis_client import init_redis, get_redis, close_redis
from lib.session_lock import session_lock
from lib.dedup import ja_processado
from lib.rate_limiter import rate_limit_excedido
from lib.cache import get_medicos_activos, set_medicos_activos

@pytest.mark.asyncio
async def test_redis_connection():
    with patch("redis.asyncio.from_url") as mock_redis_lib:
        mock_conn = AsyncMock()
        mock_redis_lib.return_value = mock_conn
        
        # Test init_redis
        with patch.dict("os.environ", {"REDIS_URL": "redis://localhost"}):
            client = await init_redis()
            assert client is not None
        
        await close_redis()
        # Verify get_redis returns None after close
        assert await get_redis() is None

@pytest.mark.asyncio
async def test_session_lock_acquire_release():
    # Patch where it is used
    with patch("lib.session_lock.get_redis", new_callable=AsyncMock) as mock_get:
        mock_redis = MagicMock()
        mock_get.return_value = mock_redis
        
        mock_redis.set = AsyncMock(return_value=True)
        # For identifier check in finally
        mock_redis.get = AsyncMock(return_value="123.0")
        mock_redis.delete = AsyncMock(return_value=1)
        
        # We need to mock time.time to match identifier
        with patch("time.time", return_value=123.0):
            async with session_lock("cli_1", "123456789"):
                pass
            
        assert mock_redis.set.called
        assert mock_redis.delete.called

@pytest.mark.asyncio
async def test_dedup_logic():
    with patch("lib.dedup.get_redis", new_callable=AsyncMock) as mock_get:
        mock_redis = MagicMock()
        mock_get.return_value = mock_redis
        
        # Test new message (NX succeeds)
        mock_redis.set = AsyncMock(return_value=True)
        is_dup = await ja_processado("cli_1", "msg_1")
        assert is_dup is False
        
        # Test duplicate message (NX fails)
        mock_redis.set = AsyncMock(return_value=None)
        is_dup = await ja_processado("cli_1", "msg_2")
        assert is_dup is True

@pytest.mark.asyncio
async def test_rate_limiter():
    with patch("lib.rate_limiter.get_redis", new_callable=AsyncMock) as mock_get:
        mock_redis = MagicMock()
        mock_get.return_value = mock_redis
        
        # Under limit
        mock_redis.incr = AsyncMock(return_value=5)
        mock_redis.expire = AsyncMock(return_value=True)
        
        limited = await rate_limit_excedido("cli_1", "user_1", limite=10)
        assert limited is False
        
        # Over limit
        mock_redis.incr = AsyncMock(return_value=11)
        limited = await rate_limit_excedido("cli_1", "user_1", limite=10)
        assert limited is True

@pytest.mark.asyncio
async def test_caching_layer():
    with patch("lib.cache.get_redis", new_callable=AsyncMock) as mock_get:
        mock_redis = MagicMock()
        mock_get.return_value = mock_redis
        
        # Cache miss
        mock_redis.get = AsyncMock(return_value=None)
        data = await get_medicos_activos("cli_1")
        assert data is None
        
        # Cache hit
        mock_redis.get = AsyncMock(return_value=json.dumps([{"id": "1", "nome": "Dr. Test"}]))
        data = await get_medicos_activos("cli_1")
        assert data is not None
        assert data[0]["id"] == "1"
