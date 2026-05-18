import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

print("Available Flash models:")
try:
    models = genai.list_models()
    for m in models:
        # Check if 'flash' or '2.' is in the model name to see if 2.5 is there
        if 'flash' in m.name.lower() or '2.' in m.name:
            print(f"- {m.name} (supports: {m.supported_generation_methods})")
except Exception as e:
    print(f"Error listing models: {e}")
