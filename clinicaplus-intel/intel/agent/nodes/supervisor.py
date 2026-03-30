# intel/agent/nodes/supervisor.py
from langchain_core.messages import SystemMessage, HumanMessage
from intel.agent.state import ConversaState
from intel.config.models import build_llm, calcular_custo, AGENT_MODELS
from intel.config.prompts import SUPERVISOR_PROMPT

_llm = build_llm("supervisor")

ROUTING_OPTIONS = ["intent", "booking", "info", "escalation", "end"]

async def supervisor_node(state: ConversaState) -> dict:
    """
    Supervisor: lê o estado actual e decide qual agente actua a seguir.
    Não responde ao paciente — só roteia.
    """
    # Verificar loop protection
    if state["turno"] >= state["max_turnos"]:
        return {"next_agent": "escalation"}

    system = SUPERVISOR_PROMPT.format(
        clinica_nome=state["clinica_nome"],
        intencao=state.get("intencao", "desconhecida"),
        turno=state["turno"],
    )

    # Pedir ao Supervisor uma decisão estruturada
    decisao_prompt = (
        "Com base na conversa e no contexto, qual agente deve actuar agora? "
        f"Responde apenas com uma palavra de: {', '.join(ROUTING_OPTIONS)}"
    )

    response = await _llm.ainvoke([
        SystemMessage(content=system),
        *state["messages"],
        HumanMessage(content=decisao_prompt),
    ])

    next_agent = response.content.strip().lower()
    # Limpar qualquer pontuação ou texto extra
    for opt in ROUTING_OPTIONS:
        if opt in next_agent:
            next_agent = opt
            break
            
    if next_agent not in ROUTING_OPTIONS:
        next_agent = "booking"  # fallback seguro

    # Rastrear custo
    usage = getattr(response, "usage_metadata", {})
    input_t  = usage.get("input_tokens", 0)
    output_t = usage.get("output_tokens", 0)
    custo    = calcular_custo(AGENT_MODELS["supervisor"]["model"], input_t, output_t)

    return {
        "next_agent": next_agent, 
        "turno": state["turno"] + 1,
        "tokens_usados": state["tokens_usados"] + input_t + output_t,
        "custo_estimado_usd": state["custo_estimado_usd"] + custo,
    }
