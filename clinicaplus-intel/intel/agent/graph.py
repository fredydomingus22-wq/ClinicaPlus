from langgraph.graph import StateGraph, END, START
from .state import AgentState

# Importação dos nós reais compilados na Fase 3
from .nodes.tenant_loader import tenant_loader
from .nodes.patient_identifier import patient_identifier
from .nodes.reasoner import reasoner
from .nodes.intent_router import (
    intent_router, 
    route_by_intent, 
    classify_intent_node, 
    route_after_classification
)
from .nodes.slot_collector import slot_collector, check_slots_complete
from .nodes.faq_responder import faq_responder
from .nodes.human_handoff import human_handoff
from .nodes.response_formatter import response_formatter
from .nodes.memory_extractor import memory_extractor
from .subgraphs.booking import booking_subgraph

def build_thread_id(remote_jid: str, tenant_id: str) -> str:
    """
    "244912345678@s.whatsapp.net" + "clinic_abc" -> "clinic_abc:244912345678"
    """
    number = remote_jid.split("@")[0].strip()
    return f"{tenant_id}:{number}"

builder = StateGraph(AgentState)

# Adicionar os nós da pipeline principal + Subgraph
builder.add_node("tenant_loader", tenant_loader)
builder.add_node("patient_identifier", patient_identifier)
builder.add_node("intent_classifier", classify_intent_node) # O "semáforo" Python
builder.add_node("reasoner", reasoner)
builder.add_node("intent_router", intent_router) # O extrator LLM
builder.add_node("booking_manager", booking_subgraph) # O Subgraph entra como um único nó
builder.add_node("faq_responder", faq_responder)
builder.add_node("human_handoff", human_handoff)
builder.add_node("memory_extractor", memory_extractor)
builder.add_node("response_formatter", response_formatter)

# Fluxo Linear Inicial
builder.add_edge(START, "tenant_loader")
builder.add_edge("tenant_loader", "patient_identifier")
builder.add_edge("patient_identifier", "intent_classifier")

# Ramificação Crítica: Decisão de Roteamento Pós-Classificação (Shortcut para Saudações)
builder.add_conditional_edges("intent_classifier", route_after_classification, {
    "go_to_reasoner": "reasoner",
    "skip_to_final":  "response_formatter"
})

builder.add_edge("reasoner", "intent_router")

# Ramificação: Roteador de Intenção (Extração estruturada de Slots)
builder.add_conditional_edges("intent_router", route_by_intent, {
    "booking_manager":    "booking_manager",
    "faq_responder":      "faq_responder",
    "human_handoff":      "human_handoff",
    "response_formatter": "response_formatter",
})

# Caminhos de convergência: Todos passam pela memória antes da resposta final
builder.add_edge("booking_manager",    "memory_extractor")
builder.add_edge("faq_responder",      "memory_extractor")
builder.add_edge("human_handoff",      "memory_extractor")

# O extrator de memória é transparente para o paciente, segue para formatação
builder.add_edge("memory_extractor",   "response_formatter")
builder.add_edge("response_formatter", END)

# Singleton
_graph = None

async def init_graph(checkpointer=None, store=None):
    global _graph
    # Compilamos o grafo com o checkpointer (short-term) e store (long-term)
    _graph = builder.compile(checkpointer=checkpointer, store=store)
    return _graph

async def get_graph():
    global _graph
    if _graph is None:
        # Fallback sem persistência para testes rápidos se não inicializado
        _graph = builder.compile()
    return _graph
