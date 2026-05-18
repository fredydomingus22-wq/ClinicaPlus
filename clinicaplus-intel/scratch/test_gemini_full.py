import asyncio
import os
import sys
from dotenv import load_dotenv

# Path adjust
sys.path.append(os.getcwd())

load_dotenv()

from intel.agent.providers import get_llm
from langchain_core.messages import HumanMessage

async def test():
    print("Iniciando teste Gemini 2.5 Flash...")
    try:
        llm = get_llm('gemini_25_flash')
        print(f"Model ID: {llm.model}")
        res = await llm.ainvoke([HumanMessage(content='Olá, gostaria de marcar uma consulta.')])
        print(f"--- RESPOSTA GEMINI ---\n{res.content}\n--- FIM ---")
    except Exception as e:
        print(f"ERRO: {e}")

if __name__ == "__main__":
    # Fix for Windows loop
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test())
