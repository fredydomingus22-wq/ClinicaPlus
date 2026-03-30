import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models import BaseChatModel

# ── Definição de providers por agente ─────────────────────────────────────────
# CONCORDADO: Usar apenas Gemini 1.5 Flash (Google) para aproveitar free tier
AGENT_MODELS: dict[str, dict] = {
    "supervisor": {
        "provider":    "google",
        "model":       "gemini-1.5-flash",
        "temperature": 0.1,
        "max_tokens":  512,
    },
    "intent": {
        "provider":    "google",
        "model":       "gemini-1.5-flash",
        "temperature": 0,
        "max_tokens":  512,
    },
    "booking": {
        "provider":    "google",
        "model":       "gemini-1.5-flash",
        "temperature": 0.1,
        "max_tokens":  1024,
    },
    "info": {
        "provider":    "google",
        "model":       "gemini-1.5-flash",
        "temperature": 0.2,
        "max_tokens":  512,
    },
    "escalation": {
        "provider":    "google",
        "model":       "gemini-1.5-flash",
        "temperature": 0.1,
        "max_tokens":  256,
    },
}

# Preços por 1M tokens (input/output) — Gemini 1.5 Flash
PRICING_USD_PER_1M = {
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
}


def build_llm(agent_name: str) -> BaseChatModel:
    """
    Constrói o LLM correcto para um agente.
    Muda apenas aqui para trocar de provider.
    """
    cfg = AGENT_MODELS.get(agent_name, AGENT_MODELS["info"])

    # Fallback se a chave Google não existir (para testes de fumo/CI)
    if not os.environ.get("GOOGLE_API_KEY"):
        print(f"⚠️ AVISO: GOOGLE_API_KEY não encontrada. Agente '{agent_name}' pode falhar.")
        # Retornar um Fake se fosse para testes, mas aqui mantemos o erro para visibilidade

    return ChatGoogleGenerativeAI(
        model=cfg["model"],
        temperature=cfg["temperature"],
        max_output_tokens=cfg["max_tokens"],
        google_api_key=os.environ.get("GOOGLE_API_KEY", ""),
    )


def calcular_custo(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calcula custo estimado em USD para uma chamada."""
    pricing = PRICING_USD_PER_1M.get(model, {"input": 0, "output": 0})
    return (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000
