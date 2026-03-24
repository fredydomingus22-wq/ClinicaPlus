import redis.asyncio as redis
import os

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

class RedisClient:
    def __init__(self):
        self.client = None

    async def connect(self):
        if not self.client:
            self.client = redis.from_url(REDIS_URL, decode_responses=True)
        return self.client

    async def disconnect(self):
        if self.client:
            await self.client.close()
            self.client = None

redis_client = RedisClient()

async def get_redis():
    return await redis_client.connect()
