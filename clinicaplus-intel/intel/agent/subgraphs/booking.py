from langgraph.graph import StateGraph, START, END
from ..state import AgentState
from ..nodes.slot_collector import slot_collector, check_slots_complete
from ..nodes.action_executor import action_executor

# Definimos o Subgraph de Agendamento/Cancelamento
# Ele partilha o AgentState com o grafo pai para acesso direto a 'collected_slots'
booking_builder = StateGraph(AgentState)

# Adicionamos os nós responsáveis pela recolha e execução
booking_builder.add_node("slot_collector", slot_collector)
booking_builder.add_node("action_executor", action_executor)

# Fluxo Interno
booking_builder.add_edge(START, "slot_collector")

# Decisão interna: Se slots completos -> executa. Senão -> continua a pedir (loop interno).
booking_builder.add_conditional_edges("slot_collector", check_slots_complete, {
    "action_executor": "action_executor",
    "slot_collector":  "slot_collector",
})

# Após a execução da ação (agendar/cancelar), o subgraph termina
# e devolve o controlo ao Grafo Pai.
booking_builder.add_edge("action_executor", END)

# Compilamos o subgraph como uma ferramenta autónoma
# Nota: O grafo pai passará o checkpointer se necessário.
booking_subgraph = booking_builder.compile(checkpointer=True)
