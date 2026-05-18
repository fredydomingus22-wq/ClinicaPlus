import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta
sys.path.append(os.getcwd())
from dotenv import load_dotenv
load_dotenv()
from db_layer import db

async def create_test_booking():
    p_id = "cmnnlty6j000d2wuxy3secww1"
    c_id = "cmnnltdix00002wuxf6pngmzp"
    
    async with db.conn() as c:
        # Get a medico
        m = await c.fetchrow('SELECT id FROM medicos WHERE "clinicaId" = $1 LIMIT 1', c_id)
        if not m:
            print("No medico found")
            return
            
        m_id = m['id']
        data_hora = datetime.now() + timedelta(days=2)
        b_id = f"test_{uuid.uuid4().hex[:8]}"
        agora = datetime.now()
        
        await c.execute("""
            INSERT INTO agendamentos (id, "dataHora", "atualizadoEm", estado, canal, "pacienteId", "medicoId", "clinicaId")
            VALUES ($1, $2, $3, 'PENDENTE', 'WHATSAPP', $4, $5, $6)
        """, b_id, data_hora, agora, p_id, m_id, c_id)
        
        print(f"Agendamento de teste criado: {b_id}")

if __name__ == "__main__":
    asyncio.run(create_test_booking())
