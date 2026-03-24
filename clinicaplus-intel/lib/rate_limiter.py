from .redis_client import get_redis

async def rate_limit_excedido(clinica_id: str, numero: str, limite: int = 15, janela: int = 60) -> bool:
    """
    Check if a number has exceeded the rate limit (burst of messages).
    Default: max 15 messages per 60 seconds per patient per clinic.
    """
    redis = await get_redis()
    if not redis:
        return False

    key = f"ratelimit:intel:{clinica_id}:{numero}"
    
    # Increment the counter
    count = await redis.incr(key)
    
    # If first message, set expiry
    if count == 1:
        await redis.expire(key, janela)
    
    return count > limite
