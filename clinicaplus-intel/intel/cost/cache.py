# intel/cost/cache.py
"""
Semantic cache com Redis + embeddings.
Elimina ~30% de chamadas redundantes ao LLM.
"""
import langchain
from langchain_community.cache import RedisSemanticCache
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os

def setup_semantic_cache(redis_url: str):
    """
    Configura o semantic cache do LangChain.
    Quando uma query é semanticamente similar a uma anterior,
    retorna a resposta cacheada sem chamar a API.
    """
    try:
        # Embedding model leve para calcular similaridade
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

        # Configurar cache global do LangChain
        # NOTA: Requer que o Redis tenha o módulo RediSearch ativo
        langchain.llm_cache = RedisSemanticCache(
            redis_url=redis_url,
            embedding=embeddings,
            score_threshold=0.95,  # 0.95 = muito similar (conservador para saúde)
        )
        print("🚀 Semantic Cache (Redis) inicializado com sucesso.")
    except (ImportError, Exception) as e:
        print(f"⚠️ AVISO: Falhou ao inicializar Semantic Cache: {str(e)}")
        print("ℹ️ Continuando sem cache semântico para garantir disponibilidade.")
        langchain.llm_cache = None
