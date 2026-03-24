import json
from typing import List, Dict, Any, Optional
from .redis_client import get_redis

async def get_especialidades(clinica_id: str) -> Optional[List[str]]:
    """Retrieves cached specialties for a clinic."""
    redis = await get_redis()
    if not redis:
        return None
    
    key = f"cache:intel:{clinica_id}:especialidades"
    cached = await redis.get(key)
    if cached:
        return json.loads(cached)
    return None

async def set_especialidades(clinica_id: str, especialidades: List[str]):
    """Stores specialties in cache (TTL 1 hour)."""
    redis = await get_redis()
    if not redis:
        return
    
    key = f"cache:intel:{clinica_id}:especialidades"
    await redis.set(key, json.dumps(especialidades), ex=3600)

async def get_medicos_activos(clinica_id: str) -> Optional[List[Dict[str, Any]]]:
    """Retrieves cached active doctors for a clinic."""
    redis = await get_redis()
    if not redis:
        return None
    
    key = f"cache:intel:{clinica_id}:medicos"
    cached = await redis.get(key)
    if cached:
        return json.loads(cached)
    return None

async def set_medicos_activos(clinica_id: str, medicos: List[Dict[str, Any]]):
    """Stores active doctors in cache (TTL 1 hour)."""
    redis = await get_redis()
    if not redis:
        return
    
    key = f"cache:intel:{clinica_id}:medicos"
    await redis.set(key, json.dumps(medicos), ex=3600)

async def invalidar_cache_clinica(clinica_id: str):
    """Clears all cached data for a specific clinic."""
    redis = await get_redis()
    if not redis:
        return
    
    keys = [
        f"cache:intel:{clinica_id}:especialidades",
        f"cache:intel:{clinica_id}:medicos"
    ]
    await redis.delete(*keys)
