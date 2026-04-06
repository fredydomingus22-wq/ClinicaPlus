import asyncio
import os
import redis.asyncio as redis
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

async def inspect():
    url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    r = redis.from_url(url, decode_responses=True)
    
    # Testar com uma chave genérica ou tentar adivinhar a thread_id se soubermos o número
    # Mas vamos apenas testar o SET e GET e comparar com o tempo real
    
    agora = datetime.now().timestamp()
    test_key = "test_timeout_debug"
    
    await r.set(test_key, str(agora))
    val = await r.get(test_key)
    
    print(f"Agora (timestamp): {agora}")
    print(f"Valor no Redis: {val}")
    print(f"Diferença: {agora - float(val)}")
    
    # Verificar se algum outro processo mudou o valor
    await asyncio.sleep(1)
    val2 = await r.get(test_key)
    print(f"Valor após 1s: {val2}")

if __name__ == "__main__":
    asyncio.run(inspect())
