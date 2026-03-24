import asyncio
import time
from contextlib import asynccontextmanager
from typing import Optional
from .redis_client import get_redis

@asynccontextmanager
async def session_lock(clinica_id: str, numero: str, timeout: int = 15):
    """
    Context manager for a distributed lock in Redis.
    Structure: lock:intel:{clinica_id}:{numero}
    """
    redis = await get_redis()
    if not redis:
        yield
        return

    lock_key = f"lock:intel:{clinica_id}:{numero}"
    identifier = str(time.time())
    
    # Try to acquire the lock
    acquired = False
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if await redis.set(lock_key, identifier, ex=timeout, nx=True):
            acquired = True
            break
        await asyncio.sleep(0.1)
    
    if not acquired:
        print(f"⚠️ Falha ao obter lock para {lock_key} após {timeout}s")
        # In case of timeout, we still yield to avoid breaking the message flow, 
        # but the overlap might happen.
        yield
        return

    try:
        yield
    finally:
        # Only release if we still hold the lock (check identifier)
        current_val = await redis.get(lock_key)
        if current_val == identifier:
            await redis.delete(lock_key)
