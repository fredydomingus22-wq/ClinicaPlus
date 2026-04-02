import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.pool import init_pool, close_pool
from intel.routers.webhook import router as webhook_router
from routers.health import router as health_router
from routers.admin import router as admin_router
from jobs.scheduler import start_scheduler
from intel.cost.cache import setup_semantic_cache
from intel.agent.graph import init_graph, get_graph
from intel.agent.checkpointer import get_checkpointer

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Events
    print("Iniciando ClinicaPlus Intelligence...")
    await init_pool()
    
    # Inicializar Agentes e Cache Semântico
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    setup_semantic_cache(redis_url)
    
    # Gerir o ciclo de vida do Checkpointer Postgres
    async with get_checkpointer() as checkpointer:
        await checkpointer.asetup()
        await init_graph(checkpointer) # Inicializa grafo com persistência
        
        start_scheduler() # Inicia o agendador de tarefas
        print("ClinicaPlus Intelligence pronta e persistente via LangGraph-Postgres.")
        
        yield

    # Shutdown Events
    print("Fechando ClinicaPlus Intelligence...")
    await close_pool()

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

# Rotas basicas
@app.get("/")
async def root():
    return {"message": "ClinicaPlus Intelligence API", "status": "online"}

# Registar rotas
app.include_router(webhook_router)
app.include_router(health_router)
app.include_router(admin_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
