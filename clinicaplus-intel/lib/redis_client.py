import os
import redis.asyncio as redis
from typing import Optional

_redis_client: Optional[redis.Redis] = None

async def init_redis():
    """Initializes the global Redis client."""
    global _redis_client
    url = os.environ.get("REDIS_URL")
    if not url:
        print("⚠️ REDIS_URL não definida. Funcionalidades de cache/lock estarão desativadas.")
        return None
    
    _redis_client = redis.from_url(url, decode_responses=True)
    try:
        await _redis_client.ping()
        print("✅ Redis conectado com sucesso.")
    except Exception as e:
        print(f"❌ Erro ao conectar ao Redis: {e}")
        _redis_client = None
    
    return _redis_client

async def get_redis() -> Optional[redis.Redis]:
    """Returns the global Redis client instance."""
    return _redis_client

async def close_redis():
    """Closes the Redis client connection."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
