from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from intel.agent.state import AgentState
from intel.agent.prompts.builder import FAQ_RESPONDER_PROMPT

async def faq_responder(state: AgentState) -> dict:
    """Responde a perguntas e dúvidas com base nas configurações da clínica."""
    config = state.get("clinic_config", {})
    messages = state.get("messages", [])
    patient_message_obj = next((m for m in reversed(messages) if isinstance(m, HumanMessage)), None)
    patient_message = patient_message_obj.content if patient_message_obj else ""
    
    medicos_info = "Não disponível"
    if "medicos" in config:
        medicos_info = ", ".join([f"Dr(a). {m['nome']} ({m['especialidade']}): {m['preco']} Kz" for m in config["medicos"]])

    prompt = FAQ_RESPONDER_PROMPT.format(
        clinic_name=config.get("name", "Nossa Clínica"),
        specialties=", ".join(config.get("specialties", [])),
        doctors_prices=medicos_info,
        working_hours=config.get("working_hours", "Consulte a nossa recepção para o horário actualizado"),
        accepted_insurance=", ".join(config.get("seguradoras", [])) if config.get("seguradoras") else "Consulte a recepção para saber a lista de acordos activos",
        cancellation_policy=config.get("cancellation_policy", "Por favor, avise com pelo menos 24h de antecedência"),
        location=config.get("location", "Angola"),
        patient_question=patient_message
    )
    
    provider = state.get("llm_provider", "groq")
    try:
        from intel.agent.providers import get_llm
        llm = get_llm(provider)
        resp = await llm.ainvoke([HumanMessage(content=prompt)])
        ai_message = resp
    except Exception as e:
        import traceback
        print(f"❌ ERRO no FAQ Responder: {str(e)}")
        traceback.print_exc()
        ai_message = AIMessage(content="Neste momento estou com problemas em acessar o meu sistema de informações. Recomendo contactar a recepção directamente.")
        
    return {
        "messages": [ai_message]
    }
