from datetime import datetime, timezone
import sys
import os
from langchain_core.messages import SystemMessage
from intel.agent.state import AgentState
from intel.agent.prompts.builder import build_system_prompt

# Adicionar root ao sys.path temporariamente para o db_layer
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

async def tenant_loader(state: AgentState) -> dict:
    """Carrega dados da clínica, perfil do paciente e próximas consultas."""
    tenant_id = state.get("tenant_id")
    patient_id = state.get("patient_id")
    config = state.get("clinic_config", {})
    patient_data = state.get("patient_data", {})
    
    from db_layer import db
    
    # 1. Carregar Config da Clínica (se ainda não carregada)
    if not config or config.get("name") == "Clínica Padrão":
        try:
            config = await db.buscar_config_clinica(tenant_id)
            print(f"✅ Contexto Clínica carregado: {config.get('name')}")
        except Exception as e:
            print(f"❌ Erro ao carregar clínica {tenant_id}: {e}")
            config = {"name": f"Clínica ({tenant_id})", "specialties": []}
            
    # 2. Carregar Dados do Paciente e Agendamentos
    if patient_id and not patient_data:
        try:
            # Buscar perfil básico
            p = await db.paciente_por_id(tenant_id, patient_id)
            # Buscar próximas consultas
            proximas = await db.proximos_agendamentos_paciente(tenant_id, patient_id)
            
            patient_data = {
                "perfil": {
                    "nome": p.nome if p else state.get("patient_name"),
                    "alergias": p.alergias if p else None,
                    "telefone": p.telefone if p else state.get("whatsapp_number")
                },
                "agendamentos": [
                    {
                        "data": a.dataHora.isoformat(),
                        "medico": a.medicoNome,
                        "especialidade": a.medicoEsp,
                        "estado": a.estado
                    } for a in proximas
                ]
            }
            print(f"👤 Contexto Paciente carregado: {patient_data['perfil']['nome']} ({len(proximas)} consultas)")
        except Exception as e:
            print(f"⚠️ Erro ao carregar dados do paciente {patient_id}: {e}")
            patient_data = {"perfil": {"nome": state.get("patient_name")}, "agendamentos": []}

    updates = {
        "clinic_config": config,
        "patient_data": patient_data,
        "last_activity_ts": datetime.now(timezone.utc).isoformat()
    }
    
    # 3. Injectar/Atualizar SystemMessage
    # Nota: No LangGraph multi-turno, podemos querer atualizar o SystemMessage 
    # se o contexto mudar drasticamente, mas por agora injetamos apenas se não existir.
    messages = state.get("messages", [])
    has_system = any(isinstance(m, SystemMessage) for m in messages)
    
    if not has_system:
        from intel.agent.prompts.builder import build_system_prompt
        sys_prompt = build_system_prompt(
            config, 
            datetime.now(timezone.utc).isoformat(),
            patient_data
        )
        sys_msg = SystemMessage(content=sys_prompt)
        updates["messages"] = [sys_msg]
        
    return updates
