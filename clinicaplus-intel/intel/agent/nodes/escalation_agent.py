# intel/agent/nodes/escalation_agent.py
from langchain_core.messages import SystemMessage, AIMessage
from intel.agent.state import ConversaState
from intel.config.models import build_llm, calcular_custo, AGENT_MODELS
from intel.config.prompts import ESCALATION_PROMPT

_llm = build_llm("escalation")

async def escalation_node(state: ConversaState) -> dict:
    """
    Escalation Agent: encaminha para contacto humano.
    Usado em casos de emergência ou quando o loop de conversa é excedido.
    """
    system = ESCALATION_PROMPT.format(
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
    custo    = calcular_custo(AGENT_MODELS["escalation"]["model"], input_t, output_t)

    return {
        "messages": [AIMessage(content=response.content)],
        "next_agent": "end",
        "tokens_usados":      state["tokens_usados"] + input_t + output_t,
        "custo_estimado_usd": state["custo_estimado_usd"] + custo,
    }
