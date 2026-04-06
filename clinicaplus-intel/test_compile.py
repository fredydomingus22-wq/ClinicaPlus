from langgraph.graph import StateGraph, START, END
from typing import TypedDict

class State(TypedDict):
    val: str

builder = StateGraph(State)
builder.add_node("node", lambda x: x)
builder.add_edge(START, "node")
builder.add_edge("node", END)

try:
    graph = builder.compile(checkpointer=True)
    print("Compilação com checkpointer=True funcionou!")
except Exception as e:
    print(f"Erro na compilação: {e}")
