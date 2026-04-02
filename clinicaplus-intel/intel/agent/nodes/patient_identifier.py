import sys
import os
from intel.agent.state import AgentState

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

async def patient_identifier(state: AgentState) -> dict:
    """Identifica ou cria o paciente de forma isolada para o tenant."""
    if state.get("patient_id"):
        return {}
        
    tenant_id = state.get("tenant_id")
    wa_number = state.get("whatsapp_number")
    
    try:
        from db_layer import db
        paciente = await db.paciente_por_telefone(tenant_id, wa_number)
        
        if paciente:
            return {
                "patient_id": paciente.id,
                "patient_name": paciente.nome
            }
        else:
            return {
                "patient_id": f"new_{wa_number}",
                "patient_name": "Caro Paciente"
            }
    except Exception:
        return {
            "patient_id": f"mock_{wa_number}",
            "patient_name": "Caro Paciente"
        }
