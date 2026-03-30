# intel/agent/nodes/info_agent.py
from langchain_core.messages import SystemMessage, AIMessage
from intel.agent.state import ConversaState
from intel.config.models import build_llm, calcular_custo, AGENT_MODELS
from intel.config.prompts import INFO_PROMPT

_llm = build_llm("info")

async def info_node(state: ConversaState) -> dict:
    """
    Info Agent: responde a perguntas gerais sobre a clínica.
    Usa Google Gemini Flash para baixo custo em informações gerais.
    """
    system = INFO_PROMPT.format(
        clinica_nome=state["clinica_nome"]
    )

    response = await _llm.ainvoke([
        SystemMessage(content=system),
        *state["messages"],
    ])

    # Rastrear custo
    usage = getattr(response, "usage_metadata", {})
    input_t  = usage.get("input_tokens", 0)
    output_t = usage.get("output_tokens", 0)
    custo    = calcular_custo(AGENT_MODELS["info"]["model"], input_t, output_t)

    return {
        "messages": [AIMessage(content=response.content)],
        "next_agent": "end",
        "tokens_usados":      state["tokens_usados"] + input_t + output_t,
        "custo_estimado_usd": state["custo_estimado_usd"] + custo,
    }
