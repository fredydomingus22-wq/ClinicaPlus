from langchain_core.messages import SystemMessage, AIMessage
from app.agent.state import AgentState
from app.agent.prompts.builder import FAQ_RESPONDER_PROMPT

async def faq_responder(state: AgentState) -> dict:
    """Responde a perguntas e dúvidas com base nas configurações da clínica."""
    config = state.get("clinic_config", {})
    messages = state.get("messages", [])
    patient_message = messages[-1].content if messages else ""
    
    prompt = FAQ_RESPONDER_PROMPT.format(
        clinic_name=config.get("name", "Nossa Clínica"),
        specialties=", ".join(config.get("specialties", [])),
        working_hours=config.get("working_hours", "Consola recepção"),
        accepted_insurance=config.get("accepted_insurance", "Soba Consulta"),
        cancellation_policy=config.get("cancellation_policy", "24h de antecedência"),
        location=config.get("location", "Instalação principal"),
        patient_question=patient_message
    )
    
    provider = state.get("llm_provider", "groq")
    try:
        from app.agent.providers import get_llm
        llm = get_llm(provider)
        resp = await llm.ainvoke([SystemMessage(content=prompt)])
        ai_message = resp
    except Exception:
        ai_message = AIMessage(content="Neste momento estou com problemas em acessar o meu sistema de informações. Recomendo contactar a recepção directamente.")
        
    return {
        "messages": [ai_message]
    }
