import os
import re
from contextlib import asynccontextmanager
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver


def _get_postgres_url() -> str:
    """
    Retorna a URL de ligação Postgres compatível com psycopg3.
    
    O psycopg3 (usado pelo AsyncPostgresSaver) NÃO suporta o parâmetro
    proprietário '?pgbouncer=true' do Supabase PgBouncer.
    
    Estratégia:
    1. Usar DIRECT_URL (porta 5432, ligação directa) se disponível — preferido.
    2. Fazer fallback para DATABASE_URL após remover '?pgbouncer=true'.
    """
    # Preferência: DIRECT_URL (sem PgBouncer — port 5432)
    direct_url = os.environ.get("DIRECT_URL")
    if direct_url:
        return direct_url

    # Fallback: DATABASE_URL com o parâmetro pgbouncer removido
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://user:pass@localhost:5432/db"
    )
    # Remover parâmetros não suportados pelo psycopg3: pgbouncer, sslaccept, etc.
    db_url = re.sub(r"[?&]pgbouncer=[^&]*", "", db_url)
    db_url = re.sub(r"[?&]sslaccept=[^&]*", "", db_url)
    # Limpar ? ou & sobrantes
    db_url = re.sub(r"\?$", "", db_url)
    db_url = re.sub(r"\?&", "?", db_url)

    return db_url


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
