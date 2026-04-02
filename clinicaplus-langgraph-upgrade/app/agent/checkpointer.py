"""
AVISO: Chamar .setup() apenas via scripts/setup_checkpointer.py
"""
import os
from contextlib import asynccontextmanager
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

@asynccontextmanager
async def get_checkpointer():
    """
    Retorna o AsyncPostgresSaver configurado para uso produtivo com async psycopg3.
    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL is not set.")
    
    async with AsyncPostgresSaver.from_conn_string(db_url) as checkpointer:
        yield checkpointer
