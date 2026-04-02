import json
from langchain_core.messages import SystemMessage, AIMessage
from app.agent.state import AgentState
from app.agent.prompts.builder import SLOT_COLLECTOR_PROMPT

SLOTS_BY_INTENT = {
    "agendar":  ["specialty", "date", "time", "confirmation"],
    "cancelar": ["appointment_reference", "cancellation_reason", "confirmation"]
}
MAX_SLOTS_PER_INTENT = 4

def check_slots_complete(state: AgentState) -> str:
    missing = state.get("missing_slots", [])
    if not missing:
        return "action_executor"
    return "slot_collector"

async def slot_collector(state: AgentState) -> dict:
    """Solicita a informação em falta ao paciente."""
    intent = state.get("intent", "")
    collected = state.get("collected_slots", {})
    required_slots = SLOTS_BY_INTENT.get(intent, [])
    
    missing = [s for s in required_slots if s not in collected or not collected[s]]
    next_missing = missing[0] if missing else ""
    
    turn_count = state.get("turn_count", 0)
    messages = state.get("messages", [])
    recent_msgs = [m for m in messages if getattr(m, "content", "")]
    recent_text = "\n".join([f"{'Paciente' if m.type=='human' else 'IA'}: {m.content}" for m in recent_msgs[-3:]])
    
    config = state.get("clinic_config", {})
    specialties = ", ".join(config.get("specialties", []))
    
    prompt = SLOT_COLLECTOR_PROMPT.format(
        intent=intent,
        collected_slots_json=json.dumps(collected, ensure_ascii=False),
        next_missing_slot=next_missing,
        available_specialties=specialties,
        turn_count=turn_count,
        booking_summary=json.dumps(collected, ensure_ascii=False),
        recent_messages=recent_text
    )
    
    try:
        from app.agent.providers import get_llm
        llm = get_llm(state.get("llm_provider", "groq"))
        resp = await llm.ainvoke([SystemMessage(content=prompt)])
        ai_message = resp
    except Exception:
        # Fallback caso falhe o envio
        text = f"Para prosseguir, necessito de saber: {next_missing}."
        if next_missing == "specialty":
            text = f"Qual é a especialidade desejada? Temos: {specialties}"
        elif next_missing == "confirmation":
            text = "As informações estão correctas? Confirma por favor."
            
        ai_message = AIMessage(content=text)
        
    return {
        "missing_slots": missing,
        "messages": [ai_message]
    }
