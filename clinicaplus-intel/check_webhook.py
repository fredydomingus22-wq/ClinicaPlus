import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def check():
    url = os.getenv("EVOLUTION_API_URL", "").rstrip("/")
    key = os.getenv("EVOLUTION_API_KEY")
    instance = "cp-multipla-luanda-ca1835"
    
    print(f"DEBUG: Checking webhooks for instance '{instance}' at {url}")
    
    headers = {"apikey": key}
    async with httpx.AsyncClient() as client:
        try:
            # Search for webhooks for this instance
            resp = await client.get(f"{url}/webhook/find/{instance}", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                print(f"OK: Webhook configuration found:")
                print(f"   - URL: {data.get('url')}")
                print(f"   - Enabled: {data.get('enabled')}")
                print(f"   - Events: {data.get('events')}")
            else:
                print(f"WARN: No specific webhook found for {instance} (Code {resp.status_code})")
                
            # Also check global webhooks
            resp_global = await client.get(f"{url}/webhook/find", headers=headers)
            if resp_global.status_code == 200:
                print(f"OK: Global webhooks found: {resp_global.text[:200]}...")
            
        except Exception as e:
            print(f"ERROR: Failed to check webhooks: {e}")

if __name__ == "__main__":
    asyncio.run(check())
