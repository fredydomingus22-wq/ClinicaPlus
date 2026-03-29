from .redis_client import get_redis

async def ja_processado(msg_id: str) -> bool:
    """Verifica se uma mensagem já foi processada (deduplicação por ID)."""
    redis = await get_redis()
    key = f"dedup:{msg_id}"
    res = await redis.set(key, "1", ex=3600, nx=True)
    return res is None
