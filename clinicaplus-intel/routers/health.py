from typing import Any, Dict
from fastapi import APIRouter
from db.pool import get_pool
from lib.redis_client import get_redis

router = APIRouter()

@router.get("/health")
async def health_check():
    health: Dict[str, Any] = {
        "status": "up",
        "service": "clinicaplus-intel",
        "dependencies": {
            "database": "unknown",
            "redis": "unknown"
        }
    }
    
    # Check Database
    try:
        pool = await get_pool()
        if pool:
            async with pool.acquire() as connection:
                await connection.execute("SELECT 1")
            health["dependencies"]["database"] = "up"
        else:
            health["dependencies"]["database"] = "down: pool_not_initialized"
            health["status"] = "degraded"
    except Exception as e:
        health["dependencies"]["database"] = f"down: {str(e)}"
        health["status"] = "degraded"
        
    # Check Redis
    try:
        redis = await get_redis()
        if redis:
            await redis.ping()
            health["dependencies"]["redis"] = "up"
        else:
            health["dependencies"]["redis"] = "down: not_initialized"
            health["status"] = "degraded"
    except Exception as e:
        health["dependencies"]["redis"] = f"down: {str(e)}"
        health["status"] = "degraded"
        
    return health
