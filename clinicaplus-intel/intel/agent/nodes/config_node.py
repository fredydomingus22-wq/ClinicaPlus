# intel/agent/nodes/config_node.py
from intel.agent.state import ConversaState
from db_layer import db

async def config_node(state: ConversaState) -> dict:
    """
    Config Node: O "Cérebro" inicial do agente.
    Carrega as configurações da clínica, especialidades e convênios no estado.
    Garante que o agente saiba exatamente onde está e que regras seguir.
    """
    tenant_id = state.get("tenant_id")
    if not tenant_id:
        # Tenta recuperar das mensagens se não estiver no estado (fallback de segurança)
        # Normalmente o tenant_id já vem no input inicial do LangGraph
        return {}

    # 1. Buscar configurações da clínica no DB
    config = await db.buscar_config_clinica(tenant_id)
    
    # 2. Identificar paciente se possível (pelo número_wa)
    paciente_id = state.get("paciente_id")
    numero_wa = state.get("numero_wa")
    
    paciente_dados = {}
    if not paciente_id and numero_wa:
        paciente = await db.paciente_por_telefone(tenant_id, numero_wa)
        if paciente:
            paciente_id = paciente.id
            paciente_dados = {
                "paciente_id": paciente.id,
                "paciente_nome": paciente.nome
            }

    print(f"⚙️ Config Node: Contexto carregado para a clínica {tenant_id}")

    return {
        "clinic_config": config,
        **paciente_dados
    }
