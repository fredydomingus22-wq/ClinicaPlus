import os
import httpx
from typing import List, Dict, Any, Optional
import pydantic

class EvolutionClient:
    """Cliente HTTPX para interagir com a Evolution API (WhatsApp)."""
    
    def __init__(self):
        self.base_url = os.environ.get("EVOLUTION_API_URL", "").rstrip("/")
        self.api_key = os.environ.get("EVOLUTION_API_KEY", "")
        # The key should be passed as header 'apikey'
        self.headers = {
            "Content-Type": "application/json",
            "apikey": self.api_key
        }

    async def enviar_texto(self, instancia_nome: str, numero: str, texto: str) -> bool:
        """Envia uma mensagem de texto simples."""
        url = f"{self.base_url}/message/sendText/{instancia_nome}"
        payload = {
            "number": numero,
            "text": texto,
            "delay": 1200 # Simulated typing delay
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers, timeout=10.0)
                response.raise_for_status()
                return True
            except httpx.HTTPError as e:
                print(f"Erro ao enviar texto para {numero}: {e}")
                return False

    async def enviar_poll(self, instancia_nome: str, numero: str, pergunta: str, opcoes: List[str]) -> bool:
        """Envia uma mensagem do tipo Poll (sondagem) com as opções."""
        url = f"{self.base_url}/message/sendPoll/{instancia_nome}"
        
        # Evolution API format for sendPoll
        poll_options = []
        for opt in opcoes:
             # Ensure correct format (depends on exact Evolution version, typically just string name)
             # V2 requires {"optionName": "str"}
             poll_options.append({"optionName": opt})
             
        payload = {
            "number": numero,
            "name": pergunta,
            "options": poll_options,
            "selectableCount": 1, 
            "delay": 1200
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers, timeout=10.0)
                response.raise_for_status()
                return True
            except httpx.HTTPError as e:
                print(f"Erro ao enviar poll para {numero}: {e}")
                return False
