from fastapi import APIRouter, HTTPException
from db.pool import get_pool

router = APIRouter(prefix="/admin")

@router.get("/db-stats")
async def db_stats():
    pool = get_pool()
    if not pool:
         raise HTTPException(status_code=503, detail="Pool indisponível")
    
    # Ler totais p/ admin das métricas
    async with pool.acquire() as conn:
        users = await conn.fetchval('SELECT COUNT(*) FROM usuarios')
        agendamentos = await conn.fetchval('SELECT COUNT(*) FROM agendamentos')
    
    return {"status": "ok", "stats": {"usuarios": users, "agendamentos": agendamentos}}
