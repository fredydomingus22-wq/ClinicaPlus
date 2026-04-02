from app.agent.state import AgentState
from langchain_core.messages import AIMessage

WHATSAPP_MAX_LENGTH = 4096

async def response_formatter(state: AgentState) -> dict:
    """Nó final para formatar/truncar a resposta para o WhatsApp."""
    messages = state.get("messages", [])
    
    ai_msg = None
    for m in reversed(messages):
        if isinstance(m, AIMessage):
            ai_msg = m
            break
            
    if not ai_msg or not hasattr(ai_msg, "content") or not ai_msg.content:
        # Fallback de segurança se nenhuma resposta gerada
        fallback = AIMessage(content="Ocorreu um erro interno. A nossa equipa já foi notificada. Por favor tenta de novo mais tarde.")
        return {"messages": [fallback]}
        
    content = str(ai_msg.content)
    
    if len(content) > WHATSAPP_MAX_LENGTH:
        truncated = content[:WHATSAPP_MAX_LENGTH - 3] + "..."
        # LangGraph sobrescreve a mensagem se o ID for o mesmo (reducer add_messages)
        if hasattr(ai_msg, "id") and ai_msg.id:
            return {"messages": [AIMessage(content=truncated, id=ai_msg.id)]}
        else:
            return {"messages": [AIMessage(content=truncated)]}
            
    return {}
