import json
from langchain_core.messages import SystemMessage, HumanMessage
from intel.agent.state import AgentState
from intel.agent.prompts.builder import INTENT_ROUTER_PROMPT, SLOT_EXTRACTION_PROMPT
from intel.agent.utils.intent_classifier import identify_intent_python

MAX_TURNS = 10

def _clean_slots(slots: dict) -> dict:
    """Remove slots vazios ou nulos do dicionário."""
    return {k: v for k, v in slots.items() if v is not None and v != ""}

def route_by_intent(state: AgentState) -> str:
    """Substitui a lógica de roteamento interna do nó por uma função de roteamento do grafo."""
    intent = state.get("intent")
    if intent in ["agendar", "cancelar"]:
        return "booking_manager"
    elif intent == "humano":
        return "human_handoff"
    else:
        return "faq_responder"

def classify_intent_node(state: AgentState) -> dict:
    """
    NÓ DO GRAFO: Intent Classifier (Python Determinístico).
    Identifica a intenção IMEDIATAMENTE para decidir se saltamos a LLM (reasoner).
    """
    messages = state.get("messages", [])
    patient_message_obj = next((m for m in reversed(messages) if isinstance(m, HumanMessage)), None)
    patient_message = patient_message_obj.content if patient_message_obj else ""
    
    config = state.get("clinic_config", {})
    specialties_list = config.get("specialties", [])
    
    # Classificação Determinística (Python First)
    intent, confidence = identify_intent_python(patient_message, specialties=specialties_list)
    
    if intent == "desconhecido":
        intent = "duvida"
        confidence = 0.5
        
    return {
        "intent": intent,
        "confidence": confidence
    }

def route_after_classification(state: AgentState) -> str:
    """
    DECISÃO: Se for intenção simples (saudacao, humano), saltamos o reasoner (LLM).
    Caso contrário, precisamos de análise profunda (reasoner -> intent_router).
    """
    intent = state.get("intent")
    confidence = state.get("confidence", 0.0)
    
    # Saltamos o reasoner e a extração se a intenção for trivial
    if intent in ["saudacao", "humano"] and confidence >= 0.8:
        return "skip_to_final"
    
    return "go_to_reasoner"

async def intent_router(state: AgentState) -> dict:
    """
    NÓ DO GRAFO: Intent Router (LLM Slot Extractor).
    Invocado apenas para intents que exigem extração estruturada de dados.
    """
    intent = state.get("intent")
    turn_count = state.get("turn_count", 0)
    messages = state.get("messages", [])
    patient_message_obj = next((m for m in reversed(messages) if isinstance(m, HumanMessage)), None)
    patient_message = patient_message_obj.content if patient_message_obj else ""
    
    config = state.get("clinic_config", {})
    specialties_list = config.get("specialties", [])
    
    # 3. EXTRAÇÃO DE SLOTS VIA LLM
    new_slots = {}
    if intent in ["agendar", "cancelar", "duvida"]:
        provider = state.get("llm_provider", "groq")
        try:
            from intel.agent.providers import get_llm
            from pydantic import BaseModel, Field
            
            class SlotExtraction(BaseModel):
                specialty: str = Field(None, description="Especialidade extraída.")
                date_raw: str = Field(None, description="Data relativa ou absoluta.")
                time_raw: str = Field(None, description="Horário ou período.")
                doctor_name: str = Field(None, description="Nome do médico.")
                symptom_hint: str = Field(None, description="Dica de sintoma.")

            llm = get_llm(provider)
            structured_llm = llm.with_structured_output(SlotExtraction)
            
            from datetime import datetime
            today_iso = datetime.now().isoformat()

            prompt = SLOT_EXTRACTION_PROMPT.format(
                intent=intent,
                patient_message=patient_message,
                available_specialties=", ".join(specialties_list),
                today_iso=today_iso
            )
            
            resp = await structured_llm.ainvoke([HumanMessage(content=prompt)])
            new_slots = _clean_slots(resp.model_dump())
            
        except Exception as e:
            print(f"⚠️ Aviso na extração de slots: {e}")
            new_slots = {}

    collected = state.get("collected_slots", {})
    merged = collected.copy()
    merged.update(new_slots)
    
    return {
        "collected_slots": merged,
        "turn_count": turn_count + 1
    }
