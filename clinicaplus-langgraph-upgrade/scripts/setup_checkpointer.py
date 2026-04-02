"""
SCRIPT DE MIGRATION — Executar APENAS UMA VEZ na primeira deploy.
NÃO incluir no runtime da aplicação FastAPI.
Cria as tabelas 'checkpoints' e 'checkpoint_blobs' no PostgreSQL.

Uso: python scripts/setup_checkpointer.py
Referência: pypi.org/project/langgraph-checkpoint-postgres (v3.0.5)
"""
import asyncio
import os
from dotenv import load_dotenv
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

load_dotenv()

async def setup():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Erro: DATABASE_URL não encontrada.")
        return
        
    print(f"Instalando checkpointer nas tabelas do BD...")
    async with AsyncPostgresSaver.from_conn_string(db_url) as checkpointer:
        await checkpointer.setup()
    print("Migração do LangGraph Checkpointer concluída!")

if __name__ == "__main__":
    asyncio.run(setup())
