import os
from contextlib import asynccontextmanager
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
import psycopg

@asynccontextmanager
async def get_checkpointer():
    """
    Checkpointer persistente AsyncPostgresSaver base.
    A string de conexão foca-se na TRANSACTION POOL porta 6543 do Supabase (ADR configs).
    """
    db_url = os.environ.get("DATABASE_URL", "postgresql://user:pass@localhost:5432/db")
    async with AsyncPostgresSaver.from_conn_string(db_url) as checkpointer:
        yield checkpointer
