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
        "gemini": ("gemini-2.5-flash", "google_genai"),
        "claude": ("claude-3-5-sonnet-20241022", "anthropic")
    }
    
    if provider_name not in models:
        provider_name = "gemini" # Fallback global de segurança
        
    def _create_llm(p_name):
        model_name, provider = models[p_name]
        return init_chat_model(model_name, model_provider=provider)

    primary_llm = _create_llm(provider_name)
    
    # Estratégia de Fallback Robusta:
    # Se falhar Groq (Rate Limit), vai para Gemini.
    if provider_name == "groq" or provider_name == "groq_fast":
        try:
            fb_gemini = _create_llm("gemini")
            return primary_llm.with_fallbacks([fb_gemini])
        except Exception:
            return primary_llm
            
    return primary_llm
