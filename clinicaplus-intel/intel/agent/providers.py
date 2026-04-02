import os
from langchain.chat_models import init_chat_model

def get_llm(provider_name: str = "groq"):
    """
    Retorna o LLM providenciado abstrato via init_chat_model.
    Aplica fallback em cadeia: groq -> cerebras -> gemini (se for o provider principal groq).
    """
    
    # Modelos base mapeados
    models = {
        "groq": ("llama-3.3-70b-versatile", "groq"),
        "groq_fast": ("llama-3.1-8b-instant", "groq"),
        "cerebras": ("llama3.1-70b", "groq"), # Fallback p/ Groq enquanto Cerebras driver não é oficial
        "gemini": ("gemini-1.5-flash", "google_genai"),
        "claude": ("claude-3-5-sonnet-20241022", "anthropic")
    }
    
    if provider_name not in models:
        raise ValueError(f"O provider {provider_name} não é suportado pelo sistema.")
        
    def _create_llm(p_name):
        model_name, provider = models[p_name]
        return init_chat_model(model_name, model_provider=provider)

    primary_llm = _create_llm(provider_name)
    
    # Aplicar fallbacks automáticos se o requestado principal for groq e falhar, etc.
    if provider_name == "groq":
        try:
            fb1 = _create_llm("cerebras")
            fb2 = _create_llm("gemini")
            return primary_llm.with_fallbacks([fb1, fb2])
        except Exception:
            return primary_llm
            
    return primary_llm
