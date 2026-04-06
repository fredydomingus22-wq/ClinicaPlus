from intel.agent.state import AgentState
from langchain_core.messages import AIMessage

WHATSAPP_MAX_LENGTH = 4096

async def response_formatter(state: AgentState) -> dict:
    """Nó final para formatar a resposta para o WhatsApp. Gera uma nova mensagem se a última for um ToolMessage."""
    messages = state.get("messages", [])
    if not messages:
        return {}

    last_msg = messages[-1]
    
    # Se a última mensagem for o resultado de uma Tool (action_executor correu),
    # o agente precisa de gerar uma resposta final explicando o que aconteceu.
    if hasattr(last_msg, "type") and last_msg.type == "tool":
        try:
            from intel.agent.providers import get_llm
            provider = state.get("llm_provider", "groq")
            llm = get_llm(provider)
            # O SystemMessage (contexto local) e o histórico já estão na lista `messages`
            resp = await llm.ainvoke(messages)
            
            # Adiciona a nova resposta à lista (LangGraph state faz append automático via add_messages)
            messages = messages + [resp]
            last_msg = resp
        except Exception as e:
            import traceback
            print(f"❌ ERRO no Response Formatter (Geração Pós-Tool): {str(e)}")
            traceback.print_exc()
            fallback = AIMessage(content="A operação foi concluída nos nossos sistemas, mas ocorreu um erro de formatação. O agendamento/cancelamento foi processado.")
            return {"messages": [fallback]}

    # O que quer que último seja agora, garantimos que é formatado/truncado
    if hasattr(last_msg, "content") and last_msg.content:
        content = str(last_msg.content)
        if len(content) > WHATSAPP_MAX_LENGTH:
            truncated = content[:WHATSAPP_MAX_LENGTH - 3] + "..."
            # Mantemos o ID se existir
            if hasattr(last_msg, "id") and last_msg.id:
                return {"messages": [AIMessage(content=truncated, id=last_msg.id)]}
            else:
                return {"messages": [AIMessage(content=truncated)]}
                
    return {}
