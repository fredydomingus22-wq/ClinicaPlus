from fastapi import APIRouter, BackgroundTasks, Request, Response, status
import asyncio
import logging
import traceback
from typing import Dict, Any

from app.agent.graph import build_thread_id, graph

router = APIRouter()
logger = logging.getLogger(__name__)

# Semáforo para rate-limiting multitenant (3 concorrentes por tenant)
_tenant_semaphores: Dict[str, asyncio.Semaphore] = {}

def get_tenant_semaphore(tenant_id: str) -> asyncio.Semaphore:
    if tenant_id not in _tenant_semaphores:
        _tenant_semaphores[tenant_id] = asyncio.Semaphore(3)
    return _tenant_semaphores[tenant_id]

async def process_webhook_payload(payload: dict):
    """Lógica background assíncrona do agente."""
    try:
        data = payload.get("data", {})
        key_obj = data.get("key", {})
        
        remote_jid = key_obj.get("remoteJid", "")
        instance_name = data.get("instanceName", "")
        message_body = data.get("message", {}).get("conversation", "")
        
        # Ignorar mensagens de sistema / outbounds
        if key_obj.get("fromMe", False) or not message_body:
            return
            
        if not remote_jid or not instance_name:
            logger.warning("Webhook payload ignorado por falta de JID/Instance.")
            return
            
        try:
            import sys
            import os
            sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
            from clinicaplus_intel.db_layer import db
            tenant_info = await db.resolver_ids_por_instancia(instance_name)
            
            if not tenant_info:
                logger.info(f"Instância {instance_name} ignorada silenciosamente (Tenant não existe).")
                return
            tenant_id = tenant_info["clinicaId"]
            
        except Exception as e:
            # Em modo fallback/isolate
            tenant_id = f"mock_{instance_name}"
            
        thread_id = build_thread_id(remote_jid, tenant_id)
        
        # Proteger via semáforo do tenant
        sem = get_tenant_semaphore(tenant_id)
        async with sem:
            initial_state = {
                "messages": [("user", message_body)],
                "tenant_id": tenant_id,
                "whatsapp_number": remote_jid.split("@")[0].strip(),
            }
            
            config = {"configurable": {"thread_id": thread_id}}
            result = await graph.ainvoke(initial_state, config=config)
            
            # Aqui seguiríamos conectando com Evolution API (POST /message/sendText)
            # para enviar o `result["messages"][-1].content` de volta.
            
    except Exception as e:
        logger.exception("Erro crítico no processamento de webhook em background")


@router.post("/webhook/evolution")
async def handle_evolution_webhook(request: Request, background_tasks: BackgroundTasks):
    """Recebe webhook da Evolution API e devolve 200 instantaneamente (RF-001)."""
    try:
        payload = await request.json()
    except Exception:
        return Response(status_code=status.HTTP_200_OK)
        
    background_tasks.add_task(process_webhook_payload, payload)
    return Response(status_code=status.HTTP_200_OK)
