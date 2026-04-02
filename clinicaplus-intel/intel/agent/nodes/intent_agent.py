# intel/agent/nodes/intent_agent.py
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from intel.agent.state import ConversaState
from intel.config.models import build_llm, calcular_custo, AGENT_MODELS
from intel.config.prompts import INTENT_PROMPT
import json
from datetime import datetime, timezone, timedelta

_llm = build_llm("intent")

LUANDA_TZ = timezone(timedelta(hours=1))

async def intent_node(state: ConversaState) -> dict:
    """
    Intent Agent: classifica a intenção e extrai entidades da última mensagem.
    Usa modelo barato (Haiku) — só classifica, não conversa.
    Devolve structured output com intenção, especialidade, médico, data.
    """
    if not state["messages"]:
        return {"intencao": "outro"}

    ultima_msg = state["messages"][-1].content

    # Preparar datas para o Few-Shot
    agora = datetime.now(LUANDA_TZ)
    amanha_dt = agora + timedelta(days=1)
    hoje = agora.strftime("%Y-%m-%d")
    amanha = amanha_dt.strftime("%Y-%m-%d")
    
    _MESES = ["","janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"]
    data_hoje_extenso = f"{agora.day} de {_MESES[agora.month]} de {agora.year}"

    # Injetar contexto no prompt do sistema
    system = INTENT_PROMPT.format(
        data_hoje=data_hoje_extenso,
        hoje=hoje,
        amanha=amanha,
        clinic_config=json.dumps(state.get("clinic_config", {}), ensure_ascii=False)
    )

    response = await _llm.ainvoke([
        SystemMessage(content=system),
        HumanMessage(content=f"Mensagem do paciente: \"{ultima_msg}\""),
    ])

    # Rastrear custo
    usage = getattr(response, "usage_metadata", {})
    input_t  = usage.get("input_tokens", 0)
    output_t = usage.get("output_tokens", 0)
    custo    = calcular_custo(AGENT_MODELS["intent"]["model"], input_t, output_t)

    try:
        # Tentar extrair JSON mesmo que o modelo inclua texto extra
        content = response.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        dados = json.loads(content)
    except Exception:
        dados = {"intencao": "outro"}

    return {
        "intencao":       dados.get("intencao"),
        "especialidade":  dados.get("especialidade"),
        "medico_id":      None, # Deixa para o supervisor ou booking agent escolher
        "data_preferida": dados.get("data_preferida"),
        "periodo":        dados.get("periodo"),
        "tokens_usados":  state["tokens_usados"] + input_t + output_t,
        "custo_estimado_usd": state["custo_estimado_usd"] + custo,
    }
