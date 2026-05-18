import asyncio
import os
import sys
sys.path.append(os.getcwd())
from dotenv import load_dotenv
load_dotenv()
from db_layer import db

async def find_test_patient():
    async with db.conn() as c:
        # Procurar qualquer paciente
        row = await c.fetchrow("""
            SELECT id as patient_id, telefone, "clinicaId" as tenant_id, nome
            FROM pacientes
            LIMIT 1
        """)
        if row:
            print(f"PATIENT_ID: {row['patient_id']}")
            print(f"TELEFONE: {row['telefone']}")
            print(f"TENANT_ID: {row['tenant_id']}")
            print(f"NOME: {row['nome']}")
        else:
            print("Nenhum paciente com agendamentos futuros encontrado.")

if __name__ == "__main__":
    asyncio.run(find_test_patient())
