# intel/agent/nodes/booking_agent.py
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from intel.agent.state import ConversaState
from intel.config.models import build_llm, calcular_custo, AGENT_MODELS
from intel.config.prompts import BOOKING_PROMPT
from intel.agent.tools.clinica_tools import INFO_TOOLS
from intel.agent.tools.agendamento_tools import BOOKING_TOOLS
import asyncio

_llm = build_llm("booking").bind_tools(BOOKING_TOOLS + INFO_TOOLS)

async def booking_node(state: ConversaState) -> dict:
    """
    Booking Agent: agente especialista em marcações.
    Tem acesso a ferramentas de DB. Conversa directamente com o paciente.
    """
    system = BOOKING_PROMPT.format(
        clinica_nome=state["clinica_nome"],
        paciente_nome=state.get("paciente_nome") or "Paciente",
        clinica_id=state["clinica_id"],
        paciente_id=state.get("paciente_id") or "desconhecido",
        intencao=state.get("intencao") or "marcar",
        especialidade=state.get("especialidade") or "não especificada",
    )

    response = await _llm.ainvoke([
        SystemMessage(content=system),
        *state["messages"],
    ])

    # Processar tool calls se existirem
    tool_messages = []
    if hasattr(response, "tool_calls") and response.tool_calls:
        # Executar ferramentas em paralelo
        tool_map = {t.name: t for t in (BOOKING_TOOLS + INFO_TOOLS)}
        tasks    = []
        for tc in response.tool_calls:
            if tc["name"] in tool_map:
                # Injectar clinica_id e paciente_id como contexto
                args = tc["args"].copy()
                if "clinica_id" not in args:
                    args["clinica_id"] = state["clinica_id"]
                if "paciente_id" not in args and state.get("paciente_id"):
                    args["paciente_id"] = state["paciente_id"]
                tasks.append((tc["id"], tc["name"], tool_map[tc["name"]].ainvoke(args)))

        results = await asyncio.gather(*[t[2] for t in tasks], return_exceptions=True)

        for (tool_id, tool_name, _), result in zip(tasks, results):
            content = str(result) if isinstance(result, Exception) else str(result)
            tool_messages.append(ToolMessage(content=content, tool_call_id=tool_id))

        # Segunda chamada com resultados das ferramentas
        response = await _llm.ainvoke([
            SystemMessage(content=system),
            *state["messages"],
            response,
            *tool_messages,
        ])

    # Rastrear custo
    usage  = getattr(response, "usage_metadata", {})
    input_t  = usage.get("input_tokens", 0)
    output_t = usage.get("output_tokens", 0)
    custo    = calcular_custo(AGENT_MODELS["booking"]["model"], input_t, output_t)

    return {
        "messages": [AIMessage(content=response.content)],
        "next_agent": "end",
        "tokens_usados":      state["tokens_usados"] + input_t + output_t,
        "custo_estimado_usd": state["custo_estimado_usd"] + custo,
    }
