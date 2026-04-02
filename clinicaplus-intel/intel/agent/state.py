# intel/agent/state.py
from typing import TypedDict, Annotated, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class ConversaState(TypedDict):
    # Mensagens da conversa (acumuladas pelo LangGraph)
    messages: Annotated[list[BaseMessage], add_messages]

    # Contexto da conversa e Multi-tenancy
    tenant_id:     str            # ID da clínica (clinicaId no DB)
    clinica_nome:  str
    numero_wa:     str            # remoteJid (WhatsApp ID)
    paciente_id:   Optional[str]
    paciente_nome: Optional[str]
    
    # Configurações Dinâmicas e Regras de Negócio (Injetadas no início)
    clinic_config: dict           # Especialidades, Horários, Regras de Cancelamento, Convénios

    # Routing interno
    next_agent:    Optional[str]  # "intent" | "booking" | "info" | "escalation" | "end"

    # Entidades extraídas pelo IntentAgent
    intencao:      Optional[str]  # "marcar" | "cancelar" | "remarcar" | "consultar_consultas" | "info_clinica" | "urgencia" | "outro"
    especialidade: Optional[str]
    medico_id:     Optional[str]
    data_preferida: Optional[str]
    periodo:       Optional[str]

    # Dados recuperados determinísticamente da DB (RAG estruturado)
    clinica_dados:     Optional[dict]

    # Controlo de custos
    tokens_usados:     int
    custo_estimado_usd: float

    # Turno e loop control
    turno:         int
    max_turnos:    int  # default: 10 — prevenir loops infinitos
