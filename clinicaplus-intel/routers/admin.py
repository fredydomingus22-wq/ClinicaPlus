from fastapi import APIRouter, BackgroundTasks, HTTPException
from noshow.predictor import NoShowPredictor
from noshow.trainer import NoShowTrainer
from db.pool import get_pool

router = APIRouter(prefix="/admin")
predictor = NoShowPredictor()
trainer = NoShowTrainer()

async def executar_treino():
    resultado = await trainer.treinar()
    print("Treino Pipeline: ", resultado)
    if resultado.get("status") == "success":
        predictor.recarregar_modelo()

@router.post("/treinar-modelo")
async def treinar_modelo_bg(background_tasks: BackgroundTasks):
    """Inicia o pipeline de Extração e Treino XGBoost em background."""
    background_tasks.add_task(executar_treino)
    return {"status": "accepted", "message": "Treino iniciado em background"}

@router.get("/cache-reload")
async def cache_reload():
    """Recarrega os modelos base da memória RAM e caches DB locais."""
    sucesso = predictor.recarregar_modelo()
    return {"status": "ok", "xgboost_active": sucesso, "message": "Modelos recarregados"}

@router.get("/db-stats")
async def db_stats():
    pool = get_pool()
    if not pool:
         raise HTTPException(status_code=503, detail="Pool indisponível")
    
    # Exemplo: Ler totais p/ admin das métricas
    async with pool.acquire() as conn:
        users = await conn.fetchval('SELECT COUNT(*) FROM usuarios')
        agendamentos = await conn.fetchval('SELECT COUNT(*) FROM agendamentos')
    
    return {"status": "ok", "stats": {"usuarios": users, "agendamentos": agendamentos}}
