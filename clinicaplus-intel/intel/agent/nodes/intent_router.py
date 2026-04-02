import json
from langchain_core.messages import SystemMessage
from intel.agent.state import AgentState
from intel.agent.prompts.builder import INTENT_ROUTER_PROMPT

MAX_TURNS = 10

def _clean_slots(slots: dict) -> dict:
    return {k: v for k, v in slots.items() if v is not None and v != ""}

def route_by_intent(state: AgentState) -> str:
    intent = state.get("intent")
    if intent in ["agendar", "cancelar"]:
        return "slot_collector"
    elif intent == "humano":
        return "human_handoff"
    else:
        return "faq_responder"

async def intent_router(state: AgentState) -> dict:
    """Classifica a intenção e extrai entidades."""
    turn_count = state.get("turn_count", 0)
    
    # Guard clause para turnos excessivos
    if turn_count >= MAX_TURNS:
        return {"intent": "humano", "turn_count": turn_count + 1}
        
    messages = state.get("messages", [])
    patient_message = messages[-1].content if messages else ""
    provider = state.get("llm_provider", "groq")
    
    try:
        from intel.agent.providers import get_llm
        llm = get_llm(provider)
        prompt = INTENT_ROUTER_PROMPT.format(patient_message=patient_message)
        resp = await llm.ainvoke([SystemMessage(content=prompt)])
        data = json.loads(resp.content)
    except Exception:
        # Fallback offline ou erro de parsing json
        data = {"intent": "duvida", "confidence": 1.0, "extracted_slots": {}}
        
    intent = data.get("intent", "duvida")
    conf = data.get("confidence", 0.0)
    
    if conf < 0.5:
        intent = "duvida"
        
    new_slots = _clean_slots(data.get("extracted_slots", {}))
    collected = state.get("collected_slots", {})
    
    # Merge, sem substituir estado inteiro (o retorno junta o dict base no add_messages / reducer)
    # De facto, no LangGraph um reducer dict pode ser feito. Vamos apenas devolver a cópia
    merged = collected.copy()
    merged.update(new_slots)
    
    return {
        "intent": intent,
        "collected_slots": merged,
        "turn_count": turn_count + 1
    }
