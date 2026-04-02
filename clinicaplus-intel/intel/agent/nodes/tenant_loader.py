from datetime import datetime, timezone
import sys
import os
from langchain_core.messages import SystemMessage
from intel.agent.state import AgentState
from intel.agent.prompts.builder import build_system_prompt

# Adicionar root ao sys.path temporariamente para o db_layer
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

async def tenant_loader(state: AgentState) -> dict:
    """Carrega dados da clínica e injecta o SystemMessage."""
    config = state.get("clinic_config", {})
    tenant_id = state.get("tenant_id")
    
    if not config:
        try:
            from db_layer import db
            config = await db.buscar_config_clinica(tenant_id)
        except Exception:
            config = {
                "name": "Clínica Padrão",
                "specialties": ["Geral", "Cardiologia"],
                "accepted_insurance": "Sob consulta",
                "working_hours": "08:00 - 18:00",
                "cancellation_policy": "24h antecedência"
            }
            
    updates = {
        "clinic_config": config,
        "last_activity_ts": datetime.now(timezone.utc).isoformat()
    }
    
    messages = state.get("messages", [])
    has_system = any(isinstance(m, SystemMessage) for m in messages)
    
    if not has_system:
        sys_prompt = build_system_prompt(config, datetime.now(timezone.utc).isoformat())
        sys_msg = SystemMessage(content=sys_prompt)
        updates["messages"] = [sys_msg]
        
    return updates
