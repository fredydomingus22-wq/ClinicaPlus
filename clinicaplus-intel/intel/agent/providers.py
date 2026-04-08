import os
from langchain.chat_models import init_chat_model
from langchain_groq import ChatGroq
from langchain_cerebras import ChatCerebras
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI

def get_llm(provider_name: str = "openai_fast"):
    """
    Retorna o LLM providenciado abstrato via init_chat_model.
    Aplica fallback em cadeia focado na OpenAI agora que o ambiente está centralizado.
    """
    
    # Modelos base mapeados
    models = {
        "groq": ("llama-3.3-70b-versatile", "groq"),
        "groq_fast": ("llama-3.1-8b-instant", "groq"),
        "cerebras": ("llama3.3-70b", "cerebras"),
        "gemini": ("gemini-1.5-flash", "google_genai"),
        "gemini_pro": ("gemini-1.5-pro", "google_genai"),
        "claude": ("claude-3-5-sonnet-20241022", "anthropic"),
        "openai": ("gpt-4o", "openai"),
        "openai_fast": ("gpt-4o-mini", "openai"),
        "openai_reasoning": ("o1", "openai")
    }
    
    if provider_name not in models:
        provider_name = "gemini" # Novo default focado no custo-benefício do Gemini
        
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
                convert_system_message_to_human=True,
                max_retries=2
            )
        if provider == "anthropic":
            return ChatAnthropic(model=model_name, api_key=os.environ.get("ANTHROPIC_API_KEY"))
        if provider == "openai":
            return ChatOpenAI(model=model_name, api_key=os.environ.get("OPENAI_API_KEY"))
            
        return init_chat_model(model_name, model_provider=provider)

    # 1. Tentar inicializar o primário
    try:
        primary_llm = _create_llm(provider_name)
    except Exception as e:
        print(f"⚠️ Erro ao inicializar provider '{provider_name}': {e}. A tentar fallbacks...")
        try:
            return _create_llm("openai_fast")
        except Exception:
            return _create_llm("gemini") # Última tentativa
    
    # 2. Configurar Cadeia de Fallback Robusta
    fallbacks = []
    
    if provider_name in ["gemini", "gemini_pro"]:
        # Se Gemini falhar, tenta OpenAI
        try:
            fallbacks.append(_create_llm("openai_fast"))
        except: pass
    elif provider_name in ["groq", "groq_fast"]:
        # Se Groq falhar, tenta Cerebras depois OpenAI
        try:
            fallbacks.append(_create_llm("cerebras"))
        except: pass
        try:
            fallbacks.append(_create_llm("openai_fast"))
        except: pass
    elif provider_name == "claude":
        # Se Claude falhar, tenta OpenAI
        try:
            fallbacks.append(_create_llm("openai"))
        except: pass

    if fallbacks:
        return primary_llm.with_fallbacks(fallbacks)
            
    return primary_llm
