from .redis_client import get_redis

async def ja_processado(instancia: str, msg_id: str) -> bool:
    redis = await get_redis()
    key = f"dedup:{instancia}:{msg_id}"
    res = await redis.set(key, "1", ex=3600, nx=True)
    return res is None
