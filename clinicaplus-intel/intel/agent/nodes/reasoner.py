from langchain_core.messages import SystemMessage, HumanMessage
from intel.agent.state import AgentState
from intel.agent.prompts.builder import REASONER_PROMPT

async def reasoner(state: AgentState) -> dict:
    """Nó de raciocínio silencioso (Chain of Thought).
    Avalia a mensagem do paciente contextualmente antes do roteamento da intenção.
    """
    messages = state.get("messages", [])
    patient_message_obj = next((m for m in reversed(messages) if isinstance(m, HumanMessage)), None)
    
    if not patient_message_obj:
        return {"reasoning_context": "Nenhuma mensagem do paciente para analisar."}
        
    patient_message = patient_message_obj.content
    
    config = state.get("clinic_config", {})
    specialties = ", ".join(config.get("specialties", []))
    
    is_identified = "Sim" if state.get("patient_id") else "Não"
    
    prompt = REASONER_PROMPT.format(
        available_specialties=specialties,
        is_identified=is_identified,
        patient_message=patient_message
    )
    
    try:
        from intel.agent.providers import get_llm
        provider = state.get("llm_provider", "groq")
        llm = get_llm(provider)
        
        # O Reasoner faz apenas uma call isolada com o contexto atual para focar no raciocínio puro,
        # gerando uma AIMessage que vai APENAS para o estado interno, não para o array 'messages'.
        resp = await llm.ainvoke([HumanMessage(content=prompt)])
        reasoning_context = str(resp.content)
        
    except Exception as e:
        import traceback
        print(f"Aviso no Reasoner (Chain of Thought): {str(e)}")
        traceback.print_exc()
        reasoning_context = "Falha no raciocínio devido a timeout do provider. Prosseguir com rotamento normal."
        
    return {
        "reasoning_context": reasoning_context
    }
