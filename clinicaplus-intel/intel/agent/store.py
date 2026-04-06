import os
from contextlib import asynccontextmanager
from langgraph.store.postgres.aio import AsyncPostgresStore
from .checkpointer import _get_postgres_url

@asynccontextmanager
async def get_store():
    """
    Providencia uma instância de AsyncPostgresStore (LangGraph Store)
    para memória de longo prazo (Cross-Thread).
    """
    import psycopg
    from psycopg_pool import AsyncConnectionPool
    
    conn_info = _get_postgres_url()
    
    # Usamos uma pool separada ou a mesma? 
    # Para simplicidade e isolamento de erros, criamos uma pool dedicada ao Store.
    async with AsyncConnectionPool(
        conn_info,
        min_size=1,
        max_size=5,
        kwargs={
            "prepare_threshold": None,
            "autocommit": True
        }
    ) as pool:
        async with pool.connection() as conn:
            # O AsyncPostgresStore gere as tabelas internamente (se index=True)
            store = AsyncPostgresStore(conn)
            yield store
