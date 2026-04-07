import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.language_models import BaseChatModel

# ── Definição de providers por agente ─────────────────────────────────────────
AGENT_MODELS: dict[str, dict] = {
    "supervisor": {
        "provider":    "openai",
        "model":       "gpt-4o-mini",
        "temperature": 0.1,
        "max_tokens":  512,
    },
    "intent": {
        "provider":    "openai",
        "model":       "gpt-4o-mini",
        "temperature": 0,
        "max_tokens":  512,
    },
    "booking": {
        "provider":    "openai",
        "model":       "gpt-4o-mini",
        "temperature": 0.1,
        "max_tokens":  1024,
    },
    "info": {
        "provider":    "openai",
        "model":       "gpt-4o",
        "temperature": 0.2,
        "max_tokens":  512,
    },
    "escalation": {
        "provider":    "openai",
        "model":       "gpt-4o-mini",
        "temperature": 0.1,
        "max_tokens":  256,
    },
}

# Preços por 1M tokens (input/output) — Gemini 2.5 Flash-Lite
PRICING_USD_PER_1M = {
    "gemini-2.5-flash-lite": {"input": 0.03, "output": 0.10}, # Preços competitivos Feb/2026
}


def build_llm(agent_name: str) -> BaseChatModel:
    """
    Constrói o LLM correcto para um agente.
    Muda apenas aqui para trocar de provider.
    """
    cfg = AGENT_MODELS.get(agent_name, AGENT_MODELS["info"])

    provider = cfg.get("provider", "google")
    
    if provider == "openai":
        if not os.environ.get("OPENAI_API_KEY"):
            print(f"⚠️ AVISO: OPENAI_API_KEY não encontrada. Agente '{agent_name}' pode falhar.")
        return ChatOpenAI(
            model=cfg["model"],
            temperature=cfg["temperature"],
            max_tokens=cfg["max_tokens"],
            api_key=os.environ.get("OPENAI_API_KEY", "")
        )

    # Fallback default para Google
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
