from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from .expirar_conversas import expirar_conversas_job
from .lembrete_proactivo import lembrete_proactivo_job
from .retrain_noshow import retrain_noshow_job

def start_scheduler():
    scheduler = AsyncIOScheduler()
    
    # 1. Reset conversas (Diário às 03:00)
    scheduler.add_job(expirar_conversas_job, CronTrigger(hour=3, minute=0, timezone="Africa/Luanda"))
    
    # 2. Lembretes proactivos (Diário às 08:00)
    scheduler.add_job(lembrete_proactivo_job, CronTrigger(hour=8, minute=0, timezone="Africa/Luanda"))
    
    # 3. Retrain No-Show model (Semanal, Segunda às 02:00)
    scheduler.add_job(retrain_noshow_job, CronTrigger(day_of_week='mon', hour=2, minute=0, timezone="Africa/Luanda"))
    
    scheduler.start()
    print("⏰ Scheduler inicializado com 3 jobs activos.")
