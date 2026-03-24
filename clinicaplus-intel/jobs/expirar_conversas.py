import asyncio
from datetime import datetime
from db.pool import get_pool

async def expirar_conversas_job():
    """
    Job that resets/deletes expired conversations (>24h since last message).
    Runs daily at 03:00 Luanda.
    """
    print("🧹 Iniciando job de expiração de conversas...")
    pool = await get_pool()
    if not pool:
        print("❌ Pool não inicializado para expirar_conversas_job")
        return

    try:
        async with pool.acquire() as conn:
            updated = await conn.execute(
                "UPDATE wa_conversas SET estado = 'EXPIRADO', contexto = '{}' WHERE \"expiraEm\" < NOW() AND estado != 'EXPIRADO'"
            )
            print(f"✅ Job concluído. Registos afetados: {updated}")
    except Exception as e:
        print(f"❌ Erro no job expirar_conversas: {e}")
