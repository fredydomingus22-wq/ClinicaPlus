import json
from typing import Any
from .redis_client import get_redis

async def get_cache(key: str):
    redis = await get_redis()
    val = await redis.get(key)
    return json.loads(val) if val else None

async def set_cache(key: str, val: Any, ex: int = 300):
    redis = await get_redis()
    await redis.set(key, json.dumps(val), ex=ex)

async def get_especialidades(clinica_id: str):
    return await get_cache(f"cache:{clinica_id}:especialidades")

async def set_especialidades(clinica_id: str, especs: list):
    await set_cache(f"cache:{clinica_id}:especialidades", especs)

async def get_medicos_activos(clinica_id: str):
    return await get_cache(f"cache:{clinica_id}:medicos")

async def set_medicos_activos(clinica_id: str, medicos: list):
    await set_cache(f"cache:{clinica_id}:medicos", medicos)
