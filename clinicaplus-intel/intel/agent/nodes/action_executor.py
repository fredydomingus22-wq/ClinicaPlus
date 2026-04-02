from langgraph.prebuilt import ToolNode
from langchain_core.messages import AIMessage
from intel.agent.state import AgentState

async def action_executor(state: AgentState) -> dict:
    """Instancia dinamicamente o ToolNode isolado do tenant e executa as acções requeridas."""
    tenant_id = state.get("tenant_id")
    
    try:
        from intel.agent.tools.binder import build_tools_for_tenant
        from db_layer import db
        tools = build_tools_for_tenant(tenant_id, db)
    except Exception:
        # Stub para a Fase 3 (enquanto Fase 4 não existe)
        from langchain_core.tools import tool
        @tool
        def stub_tool():
            """Ferramenta stub"""
            return "OK"
        tools = [stub_tool]

    try:
        node = ToolNode(tools)
        
        # O ToolNode actua nas tool_calls da última mensagem AI
        # Aqui instanciamos on-the-fly para garantir o tenant closure
        
        # Em cenários onde o LLM não fez o tool call directamente e nós queremos forçar,
        # poderíamos injectar o tool call. Para manter idiomático LangGraph:
        result = await node.ainvoke(state)
        
        # Em fallback test onde state não tenha tool_calls, ToolNode ignora.
        return result
    except Exception as e:
        return {
            "messages": [AIMessage(content="Infelizmente não consegui completar a operação na base de dados neste momento. A recepção entrará em contacto.")]
        }
