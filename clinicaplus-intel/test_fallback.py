import os
import asyncio
from dotenv import load_dotenv
load_dotenv()

from intel.agent.providers import get_llm
from langchain_core.messages import HumanMessage

async def test_fallback():
    print("Testando Cadeia de Fallback com erro forçado (Bad API Key)...")
    
    # 1. Obter LLM com Groq (Primary)
    llm = get_llm("groq")
    
    # Vamos forçar um erro de 401 invalidando temporariamente a key local do objeto se possível
    # Ou apenas tentar correr e ver se ele cai para Cerebras/Gemini se Groq falhar
    
    try:
        print(f"Llamando invoke com LLM: {llm}")
        res = await llm.ainvoke([HumanMessage(content="Diz 'Oi, sou o fallback' se estiveres a usar Gemini.")])
        print(f"RESULTADO: {res.content}")
    except Exception as e:
        print(f"FALHA TOTAL: {e}")

if __name__ == "__main__":
    asyncio.run(test_fallback())
