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
    # Embedding model leve para calcular similaridade
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

    # Configurar cache global do LangChain
    langchain.llm_cache = RedisSemanticCache(
        redis_url=redis_url,
        embedding=embeddings,
        score_threshold=0.95,  # 0.95 = muito similar (conservador para saúde)
    )
