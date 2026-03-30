# intel/cost/cache.py
"""
Semantic cache com Redis + embeddings.
Elimina ~30% de chamadas redundantes ao LLM.
"""
import langchain
from langchain_redis import RedisSemanticCache
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os

def setup_semantic_cache(redis_url: str):
    """
    Configura o semantic cache do LangChain usando o novo pacote langchain-redis.
    Isso resolve o conflito de versão com o Redis 5.x.
    """
    try:
        # Embedding model leve para calcular similaridade
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

        # Configurar cache global do LangChain
        # NOTA: langchain-redis usa 'embeddings' em vez de 'embedding'
        langchain.llm_cache = RedisSemanticCache(
            redis_url=redis_url,
            embeddings=embeddings,
            distance_threshold=0.1,  # similar ao anterior (menor = melhor match)
        )
        print("🚀 Semantic Cache (langchain-redis) inicializado com sucesso.")
    except (ImportError, Exception) as e:
        print(f"⚠️ AVISO: Falhou ao inicializar Semantic Cache: {str(e)}")
        print("ℹ️ Continuando sem cache semântico para garantir disponibilidade.")
        langchain.llm_cache = None
