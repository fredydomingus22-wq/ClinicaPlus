import uuid
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.store.base import BaseStore
from intel.agent.state import AgentState
from langchain_core.runnables import RunnableConfig

PROMPT = """
Analise a última mensagem do paciente e o histórico recente. 
Identifique se existe algum FACTO ou PREFERÊNCIA de longo prazo que devamos memorizar 
para personalizar o atendimento futuro na Clínica.

Exemplos de factos a memorizar:
- "Sou alérgico a X"
- "Trate-me por Sr. Y"
- "Prefiro consultas de manhã"
- "O meu nome é Z" (se for diferente do registado)

Se identificar algo útil, responda APENAS com uma frase curta que descreva esse facto.
Se não houver nada de novo ou relevante para memorizar, responda com "NONE".

Histórico:
{history}
"""

async def memory_extractor(state: AgentState, config: RunnableConfig, *, store: BaseStore) -> dict:
    """Extrai e guarda factos sobre o paciente no Long-Term Store."""
    tenant_id = state.get("tenant_id")
    patient_id = state.get("patient_id")
    
    if not tenant_id or not patient_id:
        return {}
        
    messages = state.get("messages", [])
    recent = messages[-2:] # Últimas 2 mensagens (IA + Humano)
    
    history_text = ""
    for m in recent:
        role = "IA" if m.type == "ai" else "Paciente"
        history_text += f"{role}: {m.content}\n"
        
    try:
        from intel.agent.providers import get_llm
        llm = get_llm(state.get("llm_provider", "groq"))
        
        # Chamada leve para extrair o facto
        prompt = PROMPT.format(history=history_text)
        resp = await llm.ainvoke([HumanMessage(content=prompt)])
        fact = resp.content.strip()
        
        if fact.upper() != "NONE" and len(fact) > 3:
            namespace = (tenant_id, patient_id)
            memory_id = str(uuid.uuid4())
            await store.aput(namespace, memory_id, {"memory": fact})
            print(f"🧠 Memória guardada para {patient_id}: {fact}")
            
    except Exception as e:
        print(f"⚠️ Erro ao extrair memória: {e}")
        
    return {}
