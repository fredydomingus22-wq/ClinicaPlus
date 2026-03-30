# intel/agent/state.py
from typing import TypedDict, Annotated, Optional
from langchain_core.messages import BaseMessage
import operator

class ConversaState(TypedDict):
    # Mensagens da conversa (acumuladas pelo LangGraph)
    messages: Annotated[list[BaseMessage], operator.add]

    # Contexto da conversa
    clinica_id:    str
    clinica_nome:  str
    numero_wa:     str
    paciente_id:   Optional[str]
    paciente_nome: Optional[str]

    # Routing interno
    next_agent:    Optional[str]  # "intent" | "booking" | "info" | "escalation" | "end"

    # Entidades extraídas pelo IntentAgent
    intencao:      Optional[str]  # "marcar" | "cancelar" | "remarcar" | "consultar_consultas" | "info_clinica" | "urgencia" | "outro"
    especialidade: Optional[str]
    medico_id:     Optional[str]
    data_preferida: Optional[str]
    periodo:       Optional[str]

    # Controlo de custos
    tokens_usados:     int
    custo_estimado_usd: float

    # Turno e loop control
    turno:         int
    max_turnos:    int  # default: 10 — prevenir loops infinitos
