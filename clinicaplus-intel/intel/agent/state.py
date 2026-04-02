"""
Fonte: agent-kit/CLAUDE.md secção 4 | docs/domain/DOMAIN.md entidade AgentThread
"""
from typing import Annotated, TypedDict, Optional
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    # Core obrigatório
    messages: Annotated[list, add_messages]
    tenant_id: str
    whatsapp_number: str            
    
    # Identificação do paciente
    patient_id: Optional[str]       
    patient_name: Optional[str]
    
    # Contexto da clínica e paciente (injectado pelo tenant_loader)
    clinic_config: dict             
    patient_data: Optional[dict]    
    llm_provider: str               
    
    # Intenção e slots
    intent: Optional[str]           
    collected_slots: dict           
    missing_slots: list[str]        
    
    # Controlo de fluxo
    requires_human: bool
    conversation_stage: str         
    turn_count: int                 
    last_activity_ts: str           
