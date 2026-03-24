import asyncio
from noshow.trainer import NoShowTrainer

async def retrain_noshow_job():
    """
    Weekly job that retrains the XGBoost model.
    Runs every Monday at 02:00 Luanda.
    """
    print("📈 Iniciando job de re-treino do modelo No-Show...")
    trainer = NoShowTrainer()
    
    try:
        resultado = await trainer.treinar()
        status = resultado.get("status")
        message = resultado.get("message")
        
        if status == "success":
            print(f"✅ Re-treino concluído com sucesso! AUC: {resultado.get('auc')}")
        elif status == "skipping":
            print(f"ℹ️ Re-treino ignorado: {message}")
        else:
            print(f"⚠️ Re-treino finalizado com aviso: {message}")
            
    except Exception as e:
        print(f"❌ Erro no job retrain_noshow: {e}")
