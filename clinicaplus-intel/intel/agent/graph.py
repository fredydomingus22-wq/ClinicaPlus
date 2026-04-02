from langgraph.graph import StateGraph, END, START
from .state import AgentState

# Importação dos nós reais compilados na Fase 3
from .nodes.tenant_loader import tenant_loader
from .nodes.patient_identifier import patient_identifier
from .nodes.intent_router import intent_router, route_by_intent
from .nodes.slot_collector import slot_collector, check_slots_complete
from .nodes.faq_responder import faq_responder
from .nodes.human_handoff import human_handoff
from .nodes.action_executor import action_executor
from .nodes.response_formatter import response_formatter

def build_thread_id(remote_jid: str, tenant_id: str) -> str:
    """
    "244912345678@s.whatsapp.net" + "clinic_abc" -> "clinic_abc:244912345678"
    """
    number = remote_jid.split("@")[0].strip()
    return f"{tenant_id}:{number}"

builder = StateGraph(AgentState)

# Adicionar os 8 nós da pipeline
builder.add_node("tenant_loader", tenant_loader)
builder.add_node("patient_identifier", patient_identifier)
builder.add_node("intent_router", intent_router)
builder.add_node("slot_collector", slot_collector)
builder.add_node("faq_responder", faq_responder)
builder.add_node("human_handoff", human_handoff)
builder.add_node("action_executor", action_executor)
builder.add_node("response_formatter", response_formatter)

# Fluxo Linear Inicial
builder.add_edge(START, "tenant_loader")
builder.add_edge("tenant_loader", "patient_identifier")
builder.add_edge("patient_identifier", "intent_router")

# Ramificação: Roteador de Intenção
builder.add_conditional_edges("intent_router", route_by_intent, {
    "slot_collector":     "slot_collector",
    "faq_responder":      "faq_responder",
    "human_handoff":      "human_handoff",
    "response_formatter": "response_formatter",
})

# Loop condicional: Recolha de Slots
builder.add_conditional_edges("slot_collector", check_slots_complete, {
    "action_executor": "action_executor",
    "slot_collector":  "slot_collector",
})

# Caminhos de convergência (todos terminam formatando a resposta)
builder.add_edge("faq_responder",      "response_formatter")
builder.add_edge("action_executor",    "response_formatter")
builder.add_edge("human_handoff",      "response_formatter")

builder.add_edge("response_formatter", END)

# Singleton
_graph = None

async def init_graph(checkpointer=None):
    global _graph
    _graph = builder.compile(checkpointer=checkpointer)
    return _graph

async def get_graph():
    global _graph
    if _graph is None:
        _graph = builder.compile()
    return _graph

