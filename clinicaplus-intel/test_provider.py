import os
import asyncio
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from intel.agent.providers import get_llm

load_dotenv()

async def test_gemini():
    print("Testando Gemini Fallback...")
    # Forçamos o fallback dando um nome que não existe ou groq sem key
    llm = get_llm("groq") 
    print(f"LLM carregado: {llm}")
    
    try:
        resp = await llm.ainvoke([HumanMessage(content="Diz 'Olá' em Português de Angola.")])
        print(f"Resposta: {resp.content}")
    except Exception as e:
        print(f"Erro no teste: {e}")

if __name__ == "__main__":
    asyncio.run(test_gemini())
