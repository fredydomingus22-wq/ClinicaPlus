from typing import Optional
from .redis_client import get_redis

async def ja_processado(clinica_id: str, mensagem_id: str) -> bool:
    """
    Checks if a message ID has already been processed within the last hour.
    Structure: dedup:intel:{clinica_id}:{mensagem_id}
    """
    redis = await get_redis()
    if not redis:
        return False

    key = f"dedup:intel:{clinica_id}:{mensagem_id}"
    
    # Try to set the key if it doesn't exist
    # If it already exists, set returns None/False
    is_new = await redis.set(key, "1", ex=3600, nx=True)
    
    return not is_new
