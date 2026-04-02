# intel/agent/graph.py
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.redis.aio import AsyncRedisSaver
from .state import ConversaState
from .nodes.supervisor     import supervisor_node
from .nodes.config_node    import config_node
from .nodes.intent_agent   import intent_node
from .nodes.booking_agent  import booking_node
from .nodes.info_agent     import info_node
from .nodes.escalation_agent import escalation_node
from .nodes.retrieval_node  import retrieval_node
import os

def _route_supervisor(state: ConversaState) -> str:
    """Edge function: routing decision do supervisor."""
    next_agent = state.get("next_agent", "end")
    if next_agent == "end":
        return END
    return next_agent

def build_graph() -> StateGraph:
    builder = StateGraph(ConversaState)

    # ── Nós ──────────────────────────────────────────────────────────────────
    builder.add_node("config",      config_node)
    builder.add_node("intent",      intent_node)
    builder.add_node("retrieval",   retrieval_node)
    builder.add_node("supervisor",  supervisor_node)
    builder.add_node("booking",     booking_node)
    builder.add_node("info",        info_node)
    builder.add_node("escalation",  escalation_node)

    # ── Edges ─────────────────────────────────────────────────────────────────
    # 1. Carregar configuração do tenant
    builder.add_edge(START, "config")

    # 2. Classificar a intenção
    builder.add_edge("config", "intent")

    # 3. Extrair regras ou perfis do DB se necessário
    builder.add_edge("intent", "retrieval")

    # Retrieval → Supervisor (supervisor decide quem actua)
    builder.add_edge("retrieval", "supervisor")

    # Supervisor → agente especialista (routing condicional)
    builder.add_conditional_edges(
        "supervisor",
        _route_supervisor,
        {
            "booking":    "booking",
            "info":       "info",
            "escalation": "escalation",
            "end":        END,
            "intent":     "intent",  # reclassificação se necessário
        }
    )

    # Todos os agentes terminam no END (1 resposta por turno)
    builder.add_edge("booking",    END)
    builder.add_edge("info",       END)
    builder.add_edge("escalation", END)

    return builder


# Compilar o grafo (com ou sem checkpointer)
async def create_graph(checkpointer=None):
    graph = build_graph().compile(checkpointer=checkpointer)
    return graph


# Singleton — uma instância por processo
_graph = None

async def init_graph(checkpointer):
    """Inicializa o grafo global com um checkpointer já aberto."""
    global _graph
    _graph = await create_graph(checkpointer)
    return _graph

async def get_graph():
    """Retorna a instância global do grafo. Se não existir, cria uma sem persistência (fallback)."""
    global _graph
    if _graph is None:
        # Fallback para ambiente local se o lifespan não tiver inicializado (testes)
        _graph = await create_graph()
    return _graph
