from datetime import datetime, timezone
import sys
import os
from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.store.base import BaseStore
from intel.agent.state import AgentState
from intel.agent.prompts.builder import build_system_prompt

# Adicionar root ao sys.path temporariamente para o db_layer
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

async def tenant_loader(state: AgentState, config: RunnableConfig, *, store: BaseStore) -> dict:
    """Carrega dados da clínica, perfil do paciente e memórias de longo prazo."""
    tenant_id = state.get("tenant_id")
    patient_id = state.get("patient_id")
    clinic_config = state.get("clinic_config", {})
    patient_data = state.get("patient_data", {})
    
    from db_layer import db

    # 1. Carregar Config da Clínica
    if not clinic_config or clinic_config.get("name") == "Clínica Padrão":
        try:
            clinic_config = await db.buscar_config_clinica(tenant_id)
            print(f"✅ Contexto Clínica carregado: {clinic_config.get('name')}")
        except Exception as e:
            print(f"❌ Erro ao carregar clínica {tenant_id}: {e}")
            clinic_config = {"name": f"Clínica ({tenant_id})", "specialties": []}

    # 2. Carregar Dados do Paciente e Buscar Memórias (Store)
    history_memories = ""
    if patient_id:
        if not patient_data:
            try:
                # Buscar perfil básico na DB relacional
                p = await db.paciente_por_id(tenant_id, patient_id)
                proximas = await db.proximos_agendamentos_paciente(tenant_id, patient_id)
                patient_data = {
                    "perfil": {
                        "nome": p.nome if p else state.get("patient_name"),
                        "alergias": p.alergias if p else None,
                        "telefone": p.telefone if p else state.get("whatsapp_number")
                    },
                    "agendamentos": [
                        {"data": a.dataHora.isoformat(), "medico": a.medicoNome, "especialidade": a.medicoEsp, "estado": a.estado} for a in proximas
                    ]
                }
            except Exception as e:
                print(f"⚠️ Erro ao carregar dados do paciente {patient_id}: {e}")
                patient_data = {"perfil": {"nome": state.get("patient_name")}, "agendamentos": []}
        
        # 3. Buscar Memórias Transversais (Cross-Thread) via Store
        try:
            namespace = (tenant_id, patient_id)
            # Procuramos por memórias gravadas em conversas passadas (ex: preferências)
            items = await store.asearch(namespace)
            if items:
                history_memories = "\n".join([f"- {item.value['memory']}" for item in items])
                print(f"🧠 Memórias recuperadas para {patient_id}: {len(items)} itens.")
        except Exception as e:
            print(f"⚠️ Erro ao buscar Store: {e}")

    updates = {
        "clinic_config": clinic_config,
        "patient_data": patient_data,
        "last_activity_ts": datetime.now(timezone.utc).isoformat()
    }
    
    # 4. Gerar Novo SystemMessage Contextualizado com Memória
    from intel.agent.prompts.builder import build_system_prompt
    sys_prompt = build_system_prompt(
        clinic_config, 
        datetime.now(timezone.utc).isoformat(),
        patient_data
    )
    
    # Injetar memórias históricas se existirem
    if history_memories:
        sys_prompt += f"\n\nMEMÓRIAS HISTÓRICAS DO PACIENTE (Importante):\n{history_memories}"

    sys_msg = SystemMessage(content=sys_prompt)
    updates["messages"] = [sys_msg]
        
    return updates
