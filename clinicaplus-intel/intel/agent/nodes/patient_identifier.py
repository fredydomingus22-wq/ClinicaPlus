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
            # 2. Buscar agendamentos futuros para facilitar cancelamentos/adiamentos
            agendamentos = await db.proximos_agendamentos_paciente(tenant_id, paciente.id)
            
            # Formatar para o prompt (lista simples de strings + IDs para seleção)
            ag_list = []
            for ag in agendamentos:
                from db_layer import fmt_dt
                ag_list.append({
                    "id": ag.id,
                    "texto": f"{fmt_dt(ag.dataHora)} com {ag.medicoNome} ({ag.medicoEsp})",
                    "data": ag.dataHora.isoformat(),
                    "medico": ag.medicoNome,
                    "especialidade": ag.medicoEsp,
                    "estado": ag.estado
                })

            return {
                "patient_id": paciente.id,
                "patient_name": paciente.nome,
                "patient_data": {
                    "perfil": {
                        "nome": paciente.nome,
                        "telefone": paciente.telefone,
                        "alergias": paciente.alergias or "Nenhuma registada"
                    },
                    "agendamentos": ag_list
                }
            }
        else:
            return {
                "patient_id": f"new_{wa_number}",
                "patient_name": "Caro Paciente",
                "patient_data": {"perfil": {"nome": "Novo Paciente"}, "agendamentos": []}
            }
    except Exception as e:
        print(f"❌ Erro no Patient Identifier: {e}")
        return {
            "patient_id": f"mock_{wa_number}",
            "patient_name": "Caro Paciente",
            "patient_data": {"perfil": {"nome": "Paciente Estima"}, "agendamentos": []}
        }
