import os
import asyncpg
from typing import Optional
from contextlib import asynccontextmanager

_pool: Optional[asyncpg.Pool] = None

async def init_pool():
    global _pool
    if _pool is None:
        dsn = os.environ.get("DATABASE_URL")
        if not dsn:
            raise ValueError("DATABASE_URL environment variable is not set")
        
        # statement_cache_size=0 is REQUIRED for Supabase PgBouncer (Transaction Mode)
        _pool = await asyncpg.create_pool(
            dsn=dsn,
            min_size=2,
            max_size=10,
            command_timeout=10.0,
            statement_cache_size=0
        )
    return _pool

async def get_pool() -> asyncpg.Pool:
    if _pool is None:
        return await init_pool()
    return _pool

async def close_pool():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None

@asynccontextmanager
async def conn():
    pool = await get_pool()
    async with pool.acquire() as connection:
        yield connection
