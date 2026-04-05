import os
from langchain.chat_models import init_chat_model
from langchain_groq import ChatGroq
from langchain_cerebras import ChatCerebras
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_anthropic import ChatAnthropic

def get_llm(provider_name: str = "groq"):
    """
    Retorna o LLM providenciado abstrato via init_chat_model.
    Aplica fallback em cadeia: groq -> cerebras -> gemini (se for o provider principal groq).
    """
    
    # Modelos base mapeados
    models = {
        "groq": ("llama-3.3-70b-versatile", "groq"),
        "groq_fast": ("llama-3.1-8b-instant", "groq"),
        "cerebras": ("llama3.3-70b", "cerebras"),
        "gemini": ("gemini-2.5-flash", "google_genai"),
        "claude": ("claude-3-5-sonnet-20241022", "anthropic")
    }
    
    if provider_name not in models:
        provider_name = "gemini" # Fallback global de segurança
        
    def _create_llm(p_name):
        model_name, provider = models[p_name]
        
        if provider == "groq":
            return ChatGroq(model=model_name, groq_api_key=os.environ.get("GROQ_API_KEY"))
        if provider == "cerebras":
            return ChatCerebras(model=model_name, cerebras_api_key=os.environ.get("CEREBRAS_API_KEY"))
        if provider == "google_genai":
            return ChatGoogleGenerativeAI(
                model=model_name, 
                google_api_key=os.environ.get("GOOGLE_API_KEY"),
                convert_system_message_to_human=True
            )
        if provider == "anthropic":
            return ChatAnthropic(model=model_name, api_key=os.environ.get("ANTHROPIC_API_KEY"))
            
        return init_chat_model(model_name, model_provider=provider)

    # 1. Tentar inicializar o primário
    try:
        primary_llm = _create_llm(provider_name)
    except Exception as e:
        print(f"⚠️ Erro ao inicializar provider '{provider_name}': {e}. A tentar fallbacks...")
        # Se falhar a criação do objeto (ex: falta de key), retornamos logo a cadeia de fallback
        try:
            fb_ce = _create_llm("cerebras")
            fb_ge = _create_llm("gemini")
            return fb_ce.with_fallbacks([fb_ge])
        except Exception:
            return _create_llm("gemini")
    
    # 2. Configurar Cadeia de Fallback Robusta (Runtime: Rate Limits, Timeouts)
    if provider_name in ["groq", "groq_fast"]:
        fallbacks = []
        
        # Backup 1: Cerebras (Usa llama-3.3-70b se Groq falhar)
        try:
            fallbacks.append(_create_llm("cerebras"))
        except Exception as e:
            print(f"⚠️ Aviso: Cerebras indisponível como fallback: {e}")
            
        # Backup 2: Gemini (Usa gemini-2.5-flash como última barreira)
        try:
            fallbacks.append(_create_llm("gemini"))
        except Exception as e:
            print(f"⚠️ Aviso: Gemini indisponível como fallback: {e}")
        
        if fallbacks:
            return primary_llm.with_fallbacks(fallbacks)
            
    return primary_llm
