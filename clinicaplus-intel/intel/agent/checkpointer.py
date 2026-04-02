import os
import re
from contextlib import asynccontextmanager
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver


def _get_postgres_url() -> str:
    """
    Retorna a URL de ligação Postgres compatível com psycopg3.
    """
    from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
    
    # Prioridade 1: DIRECT_URL
    direct_url = os.environ.get("DIRECT_URL")
    if direct_url:
        return direct_url

    # Prioridade 2: DATABASE_URL modificada
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return "postgresql://user:pass@localhost:5432/db"

    # Remover parâmetros incompatíveis com psycopg3 (e.g. pgbouncer used by asyncpg)
    u = urlparse(db_url)
    query = parse_qs(u.query)
    
    # Parâmetros a remover
    for param in ["pgbouncer", "sslaccept"]:
        query.pop(param, None)
    
    # Reconstruir URL
    u = u._replace(query=urlencode(query, doseq=True))
    return urlunparse(u)


@asynccontextmanager
async def get_checkpointer():
    """
    Checkpointer persistente AsyncPostgresSaver.
    Usa DIRECT_URL (port 5432) se disponível, caso contrário strips o pgbouncer
    do DATABASE_URL para garantir compatibilidade com psycopg3.
    """
    conn_string = _get_postgres_url()
    async with AsyncPostgresSaver.from_conn_string(conn_string) as checkpointer:
        yield checkpointer
