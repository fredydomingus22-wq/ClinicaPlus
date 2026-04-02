from langchain_core.tools import tool
from typing import Annotated
from db_layer import db, LUANDA_TZ
from datetime import datetime, date, timedelta
import json
import os
import httpx

def build_tools_for_tenant(tenant_id: str, db_instance) -> list:
    """
    Constrói ferramentas reais com o tenant isolado via closure.
    """
    @tool
    async def get_available_slots(specialty: str, date_iso: str = None) -> str:
        """Busca horários disponíveis para uma especialidade e data (YYYY-MM-DD)."""
        try:
            d_ini = date.fromisoformat(date_iso) if date_iso else datetime.now(LUANDA_TZ).date()
            # Precisamos do medico_id ou mapear specialty para medico.
            # Aqui simulamos a busca global por especialidade, chamando db.medicos_por_especialidade
            medicos = await db_instance.conn().fetch("SELECT id FROM medicos WHERE especialidade = $1 AND \"clinicaId\" = $2", specialty, tenant_id)
            if not medicos:
                return json.dumps({"erro": f"Nenhum médico encontrado para a especialidade {specialty}"})
                
            resultados = []
            for m in medicos:
                slots = await db_instance.slots_por_regra(tenant_id, m["id"], d_ini, limite=6)
                for s in slots:
                    dt = s.dataHora.astimezone(LUANDA_TZ)
                    resultados.append({
                        "data_hora": dt.isoformat(), 
                        "medico": s.medicoNome,
                        "hora": dt.strftime('%H:%M')
                    })
            return json.dumps({"slots": resultados}, ensure_ascii=False)
        except Exception as e:
            return "Não consegui completar a operação. Por favor contacta a recepção."

    @tool
    async def book_appointment(patient_id: str, doctor_id: str, datetime_iso: str) -> str:
        """Agenda uma consulta para o paciente baseada no ID do médico e slot ISO."""
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    f"{os.environ.get('TS_API_URL', 'http://localhost:3001')}/api/agendamentos",
                    json={
                        "clinicaId": tenant_id, # Enviado directo mas bloqueado no endpoint seguro? TS API usa clinicId no body
                        "medicoId": doctor_id, 
                        "pacienteId": patient_id,
                        "dataHora": datetime_iso, 
                        "canal": "WHATSAPP", 
                        "notasTriagem": "Agendado via IA"
                    },
                    headers={"x-api-key": os.environ.get("TS_API_INTERNAL_KEY", "")},
                    timeout=10.0,
                )
                r.raise_for_status()
                ag = r.json()["data"]
            return json.dumps({"sucesso": True, "agendamento_id": ag["id"]}, ensure_ascii=False)
        except Exception as e:
            return "Não consegui completar o agendamento real. Contacta a recepção."

    @tool
    async def cancel_appointment(appointment_id: str, reason: str = "") -> str:
        """Cancela uma consulta existente do paciente."""
        try:
            async with httpx.AsyncClient() as client:
                r = await client.patch(
                    f"{os.environ.get('TS_API_URL', 'http://localhost:3001')}/api/agendamentos/{appointment_id}/estado",
                    json={"estado": "CANCELADO", "motivo": reason or "Cancelado via WhatsApp IA"},
                    headers={"x-api-key": os.environ.get("TS_API_INTERNAL_KEY", "")},
                    timeout=10.0,
                )
                r.raise_for_status()
            return json.dumps({"sucesso": True}, ensure_ascii=False)
        except Exception as e:
            return "Houve um problema a cancelar. Verifica com a recepção."

    return [get_available_slots, book_appointment, cancel_appointment]
