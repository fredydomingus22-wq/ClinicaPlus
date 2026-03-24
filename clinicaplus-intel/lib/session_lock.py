from contextlib import asynccontextmanager
from .redis_client import get_redis
import asyncio
import time

@asynccontextmanager
async def session_lock(clinica_id: str, numero: str, timeout: int = 30):
    redis = await get_redis()
    lock_key = f"lock:conversa:{clinica_id}:{numero}"
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if await redis.set(lock_key, "locked", ex=60, nx=True):
            try:
                yield
            finally:
                await redis.delete(lock_key)
            return
        await asyncio.sleep(0.5)
    
    raise TimeoutError(f"Não foi possível obter lock para a conversa {numero}")
