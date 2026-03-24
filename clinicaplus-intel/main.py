import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from db.pool import init_pool, close_pool
from routers.webhook import router as webhook_router
from routers.health import router as health_router
from routers.admin import router as admin_router
from lib.redis_client import init_redis, close_redis
from jobs.scheduler import init_scheduler, shutdown_scheduler



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Events
    print("Iniciando pool de conexões (asyncpg)...")
    await init_pool()
    print("Iniciando Redis...")
    await init_redis()
    print("Iniciando Scheduler...")
    await init_scheduler()
    yield
    # Shutdown Events
    print("Finalizando Scheduler...")
    await shutdown_scheduler()
    print("Fechando pool de conexões...")

    await close_pool()
    print("Fechando Redis...")
    await close_redis()


app = FastAPI(
    title="ClinicaPlus Intelligence",
    description="Engine de NLU e Política de Diálogo para WhatsApp da ClinicaPlus.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registar rotas
app.include_router(webhook_router)
app.include_router(health_router)
app.include_router(admin_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

