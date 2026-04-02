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
    Configurado para compatibilidade máxima com PgBouncer (Transaction Mode):
    - prepare_threshold=None: Desativa prepared statements no psycopg3.
    - autocommit=True: Necessário para o modo pipeline do LangGraph e poolers.
    """
    import psycopg
    conn_info = _get_postgres_url()
    
    # Criamos a conexão manualmente para ter controlo total sobre os parâmetros do psycopg3
    # O from_conn_string do LangGraph não permite passar estes argumentos em algumas versões.
    async with await psycopg.AsyncConnection.connect(
        conn_info, 
        prepare_threshold=None, 
        autocommit=True
    ) as conn:
        checkpointer = AsyncPostgresSaver(conn)
        yield checkpointer
