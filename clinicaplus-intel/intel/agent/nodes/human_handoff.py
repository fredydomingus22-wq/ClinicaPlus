from langchain_core.messages import AIMessage
from intel.agent.state import AgentState
import httpx
import traceback

async def human_handoff(state: AgentState) -> dict:
    """Transfere a thread para o painel de atendimento humano."""
    config = state.get("clinic_config", {})
    webhook_url = config.get("handoff_webhook")
    
    if webhook_url:
        try:
            payload = {
                "tenant_id": state.get("tenant_id"),
                "whatsapp_number": state.get("whatsapp_number"),
                "patient_id": state.get("patient_id"),
                "intent": state.get("intent")
            }
            # Idealmente dispatch para background workers em prod
            async with httpx.AsyncClient() as client:
                await client.post(webhook_url, json=payload, timeout=2.0)
        except Exception:
            # Em prod seria reportado via Sentry ou Logger
            pass
            
    return {
        "requires_human": True,
        "messages": [AIMessage(content="Estou a transferir para a nossa equipa. Um momento! 🙏")]
    }
