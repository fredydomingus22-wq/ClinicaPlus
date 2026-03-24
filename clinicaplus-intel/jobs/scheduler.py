from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from pytz import timezone
from .expirar_conversas import expirar_conversas_job
from .lembrete_proactivo import lembrete_proactivo_job
from .retrain_noshow import retrain_noshow_job

LUANDA = timezone('Africa/Luanda')
_scheduler = AsyncIOScheduler(timezone=LUANDA)

async def init_scheduler():
    """Configura e inicia o scheduler de jobs."""
    print("⏲️ Inicializando Scheduler (APScheduler)...")
    
    # 1. Expiração de conversas (Diariamente às 03:00)
    _scheduler.add_job(
        expirar_conversas_job,
        CronTrigger(hour=3, minute=0),
        id="expirar_conversas",
        replace_existing=True
    )
    
    # 2. Lembretes Proativos (Diariamente às 08:00)
    _scheduler.add_job(
        lembrete_proactivo_job,
        CronTrigger(hour=8, minute=0),
        id="lembretes_proativos",
        replace_existing=True
    )
    
    # 3. Retreino No-Show (Segundas às 02:00)
    _scheduler.add_job(
        retrain_noshow_job,
        CronTrigger(day_of_week='mon', hour=2, minute=0),
        id="retrain_noshow",
        replace_existing=True
    )
    
    _scheduler.start()
    print("✅ Scheduler iniciado com 3 jobs activos.")

async def shutdown_scheduler():
    """Finaliza o scheduler."""
    if _scheduler.running:
        _scheduler.shutdown()
        print("🛑 Scheduler finalizado.")

def get_scheduler():
    """Retorna a instância do scheduler."""
    return _scheduler
