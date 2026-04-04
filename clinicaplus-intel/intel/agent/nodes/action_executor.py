from langgraph.prebuilt import ToolNode
from langchain_core.messages import AIMessage, SystemMessage
from intel.agent.state import AgentState

async def action_executor(state: AgentState) -> dict:
    """Invoca o LLM associado às ferramentas com bind_tools (Tool Calling nativo) para gerar e executar acções."""
    tenant_id = state.get("tenant_id")
    intent = state.get("intent")
    slots = state.get("collected_slots", {})
    provider = state.get("llm_provider", "groq")
    
    try:
        from intel.agent.tools.binder import build_tools_for_tenant
        from db_layer import db
        tools = build_tools_for_tenant(tenant_id, db)
    except Exception:
        from langchain_core.tools import tool
        @tool
        def stub_tool() -> str:
            """Ferramenta stub"""
            return "OK"
        tools = [stub_tool]

    try:
        from intel.agent.providers import get_llm
        llm = get_llm(provider)
        
        # 1. Definir e associar as Tools ao LLM
        llm_with_tools = llm.bind_tools(tools)
        
        # 2. Instruir o modelo a usar a Tool
        instruction = (
            f"You are the Action Executor for a clinic. The patient confirmed they want to '{intent}'. "
            f"Their collected parameters are: {slots}. "
            "You MUST call exactly one tool to fulfill this request. Do not write text, just trigger the tool."
        )
        
        # 3. Gerar o Tool Call
        tool_call_msg = await llm_with_tools.ainvoke([SystemMessage(content=instruction)])
        
        # Guard clause se o LLM decidir não usar nenhuma tool
        if not hasattr(tool_call_msg, "tool_calls") or not tool_call_msg.tool_calls:
            return {
                "messages": [AIMessage(content="Ocorreu uma falha técnica ao invocar a operação interna. A recepção entrará em contacto.")]
            }
            
        # 4. Executar o Tool Call através do ToolNode
        node = ToolNode(tools)
        result = await node.ainvoke({"messages": [tool_call_msg]})
        
        # 5. Guardar o pedido de ferramenta e os resultados (ToolMessages) para as próximas etapas
        return {
            # Anexamos primeiro o msg do LLM (que tem os tool_calls) e depois o resultado físico das tools
            "messages": [tool_call_msg] + result["messages"]
        }
        
    except Exception as e:
        import traceback
        print(f"❌ Falha no Execute: {e}")
        traceback.print_exc()
        return {
            "messages": [AIMessage(content="Infelizmente não consegui completar a operação na base de dados neste momento. A recepção entrará em contacto.")]
        }
