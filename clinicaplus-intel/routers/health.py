from fastapi import APIRouter
from db.pool import get_pool
from lib.redis_client import get_redis


router = APIRouter()

@router.get("/health")
@router.get("/health.py")  # Alias for Railway healthcheck compatibility
async def health_check():

    health = {
        "status": "up",
        "service": "clinicaplus-intel",
        "dependencies": {
            "database": "unknown",
            "redis": "unknown"
        }

    }
    
    try:
        pool = await get_pool()
        if pool:
            async with pool.acquire() as conn:
                await conn.execute("SELECT 1")
            health["dependencies"]["database"] = "up"
        else:
            health["dependencies"]["database"] = "down: pool_not_initialized"
            health["status"] = "degraded"
    except Exception as e:
        health["dependencies"]["database"] = f"down: {str(e)}"
        health["status"] = "degraded"
        
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

