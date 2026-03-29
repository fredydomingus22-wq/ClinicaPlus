import asyncio
import os
import httpx
import asyncpg
import redis.asyncio as redis_async
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def check_db():
    url = os.getenv("DATABASE_URL")
    print(f"DEBUG: [DB] DB URL: {url.split('@')[-1] if url else 'N/A'}")
    try:
        conn = await asyncpg.connect(url)
        print("OK: [DB] Connection successful!")
        
        # 1. Check Instances
        rows = await conn.fetch('SELECT id, "evolutionName", "clinicaId" FROM wa_instancias')
        print(f"DB: Encontradas {len(rows)} instancias:")
        inst_ids = {}
        for r in rows:
            print(f"   - {r['evolutionName']} (ID: {r['id']})")
            inst_ids[r['id']] = r['evolutionName']
        
        # 2. Check Automations (IA_ASSISTANT)
        auto_rows = await conn.fetch("SELECT \"waInstanciaId\", ativo FROM wa_automacoes WHERE tipo = 'IA_ASSISTANT'")
        print(f"DB: Encontradas {len(auto_rows)} automacoes IA_ASSISTANT:")
        for ar in auto_rows:
            name = inst_ids.get(ar['waInstanciaId'], "Unknown")
            status = "ATIVO" if ar['ativo'] else "INATIVO"
            print(f"   - Instancia {name}: {status}")
            
        await conn.close()
        return rows
    except Exception as e:
        print(f"ERROR: [DB] Erro: {str(e)}")
        return None

async def check_evolution():
    url = os.getenv("EVOLUTION_API_URL", "").rstrip("/")
    key = os.getenv("EVOLUTION_API_KEY")
    print(f"DEBUG: [EVO] Checking Evolution API: {url}")
    
    endpoints = [
        "/instance/fetchInstances", # v1/v2 common
        "/instance/all",            # some v2 versions
        "/instance/all?apikey=" + key # alternative auth
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        headers = {"apikey": key}
        found = False
        for ep in endpoints:
            try:
                test_url = f"{url}{ep}"
                print(f"DEBUG: [EVO] Testing endpoint: {test_url}")
                resp = await client.get(test_url, headers=headers)
                if resp.status_code == 200:
                    print(f"OK: [EVO] Endpoint {ep} returned 200!")
                    print(f"   - Data: {resp.text[:100]}...")
                    found = True
                    break
                else:
                    print(f"WARN: [EVO] Endpoint {ep} returned {resp.status_code}")
            except Exception as e:
                print(f"ERROR: [EVO] Connection to {ep} failed: {e}")
        
        if not found:
            print("❌ [EVO] Nao foi possivel validar nenhuma das URLs da Evolution API.")

async def check_redis():
    url = os.getenv("REDIS_URL")
    print(f"DEBUG: [REDIS] Checking Redis: {url.split('@')[-1] if url else 'N/A'}")
    try:
        r = redis_async.from_url(url)
        pong = await r.ping()
        if pong:
            print("OK: [REDIS] Connection successful!")
        await r.close()
    except Exception as e:
        print(f"ERROR: [REDIS] Erro: {str(e)}")

async def main():
    print("--- INICIANDO DIAGNOSTICO DO BOT (V2) ---\n")
    await check_db()
    print("")
    await check_evolution()
    print("")
    await check_redis()
    print("\n--- DIAGNOSTICO CONCLUIDO ---")

if __name__ == "__main__":
    asyncio.run(main())
