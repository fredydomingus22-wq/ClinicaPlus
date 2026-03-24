from .redis_client import get_redis

async def rate_limit_excedido(instancia: str, numero: str, limit: int = 10, window: int = 60) -> bool:
    redis = await get_redis()
    key = f"rl:{instancia}:{numero}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, window)
    return count > limit
