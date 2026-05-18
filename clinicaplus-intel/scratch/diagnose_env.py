import os
import asyncio
from dotenv import load_dotenv
from langsmith import Client
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

async def diagnose():
    print("--- LangSmith Diagnosis ---")
    keys_to_check = ["LANGSMITH_API_KEY", "LANGCHAIN_API_KEY"]
    for key in keys_to_check:
        val = os.environ.get(key)
        if val:
            print(f"Found {key}: {val[:10]}...")
            client = Client(api_key=val)
            try:
                datasets = list(client.list_datasets(limit=1))
                print(f"✅ {key} works! Datasets found: {len(datasets)}")
            except Exception as e:
                print(f"❌ {key} failed: {e}")
        else:
            print(f"Missing {key}")

    print("\n--- Gemini Diagnosis ---")
    model = "gemini-2.5-flash"
    try:
        llm = ChatGoogleGenerativeAI(model=model)
        # Try a simple invocation
        print(f"Testing model: {model}")
        res = await llm.ainvoke("Hi")
        print(f"✅ {model} works! Response: {res.content[:20]}...")
    except Exception as e:
        print(f"❌ {model} failed: {e}")

if __name__ == "__main__":
    asyncio.run(diagnose())
