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
    Checkpointer persistente AsyncPostgresSaver utilizando Pooling de Conexões.
    """
    import psycopg
    from psycopg_pool import AsyncConnectionPool
    
    conn_info = _get_postgres_url()
    
    # Criamos a Pool para gerir múltiplas conexões de forma resiliente
    async with AsyncConnectionPool(
        conn_info,
        min_size=1,
        max_size=10,
        kwargs={
            "prepare_threshold": None,  # Compatibilidade com PgBouncer
            "autocommit": True         # LangGraph pipeline mode
        }
    ) as pool:
        # Nota: O AsyncPostgresSaver do LangGraph 1.1+ pode receber a pool diretamente 
        # em algumas implementações, mas para garantir compatibilidade, usamos a conexão da pool.
        async with pool.connection() as conn:
            checkpointer = AsyncPostgresSaver(conn)
            yield checkpointer
