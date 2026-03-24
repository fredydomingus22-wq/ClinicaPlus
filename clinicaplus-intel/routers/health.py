from fastapi import APIRouter
from db.pool import get_pool

router = APIRouter()

@router.get("/health")
async def health_check():
    health = {
        "status": "up",
        "service": "clinicaplus-intel",
        "dependencies": {
            "database": "unknown"
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
        
    return health
