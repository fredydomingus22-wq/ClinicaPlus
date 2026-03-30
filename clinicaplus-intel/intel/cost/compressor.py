# intel/cost/compressor.py
"""
Compressão de histórico de conversa.
Em vez de enviar todo o histórico ao LLM, envia um sumário + últimas N mensagens.
Redução típica: 40-60% de tokens de input.
"""
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from intel.config.models import build_llm

_llm_compressor = build_llm("intent")  # modelo mais barato para sumários

MAX_MENSAGENS_COMPLETAS = 6  # últimas 6 mensagens sempre completas
TOKENS_SUMMARY_TARGET   = 150  # sumário máximo de 150 tokens

async def comprimir_historico(
    messages: list[BaseMessage],
    clinica_nome: str,
) -> list[BaseMessage]:
    """
    Se o histórico tem mais de MAX_MENSAGENS_COMPLETAS,
    sumariza as mensagens antigas e mantém as recentes.
    """
    if len(messages) <= MAX_MENSAGENS_COMPLETAS:
        return messages  # histórico curto — não comprimir

    # Dividir: antigas (para sumarizar) + recentes (manter completas)
    antigas  = messages[:-MAX_MENSAGENS_COMPLETAS]
    recentes = messages[-MAX_MENSAGENS_COMPLETAS:]

    # Sumarizar mensagens antigas
    texto_antigas = "\n".join(
        f"{'Paciente' if isinstance(m, HumanMessage) else 'Sofia'}: {m.content}"
        for m in antigas
        if hasattr(m, "content") and isinstance(m.content, str)
    )

    prompt_sumario = (
        f"Resume em máximo {TOKENS_SUMMARY_TARGET} tokens o que foi discutido na clínica {clinica_nome}:\n\n"
        f"{texto_antigas}\n\n"
        "Resume apenas os factos relevantes para marcação de consulta: "
        "médico preferido, especialidade, data, estado da marcação."
    )

    response = await _llm_compressor.ainvoke([HumanMessage(content=prompt_sumario)])
    sumario  = response.content.strip()

    # Construir histórico comprimido
    return [
        SystemMessage(content=f"[Resumo da conversa anterior: {sumario}]"),
        *recentes,
    ]
