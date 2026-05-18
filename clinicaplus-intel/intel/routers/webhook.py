import hmac
import hashlib
import json
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from fastapi import APIRouter, Request, Header, HTTPException, BackgroundTasks

from langchain_core.messages import HumanMessage, RemoveMessage
from intel.agent.graph import get_graph
from intel.cost.tracker import CostTracker
from intel.cost.compressor import comprimir_historico
from db_layer import db, LUANDA_TZ
from lib.evolution_client import EvolutionClient
from lib.session_lock import session_lock
from lib.dedup import ja_processado
from lib.rate_limiter import rate_limit_excedido
import redis.asyncio as redis

router = APIRouter()
evo_client = EvolutionClient()

WEBHOOK_SECRET = os.environ.get("EVOLUTION_WEBHOOK_SECRET", "")

def validar_hmac(request_body: bytes, header_hmac: str) -> bool:
    if not WEBHOOK_SECRET or not header_hmac:
        return True
    expected = hmac.new(WEBHOOK_SECRET.encode(), request_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header_hmac)

def _extrair_voto_poll(update: dict) -> Optional[str]:
    try:
        poll_updates = update.get("update", {}).get("pollUpdates", [])
        if poll_updates:
            votes = poll_updates[0].get("vote", {}).get("selectedOptions", [])
            return votes[0] if votes else None
    except:
        pass
    return None

# Inicialização de componentes singletons
_redis = redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
cost_tracker = CostTracker(_redis)

async def get_clinica_nome(clinica_id: str) -> str:
    """Helper para buscar nome da clínica com log de erro."""
    async with db.conn() as c:
        try:
            # Prisma mapeia para 'clinicas' minúsculo via @@map
            row = await c.fetchrow('SELECT nome FROM clinicas WHERE id = $1', clinica_id)
            if row: return row["nome"]
            print(f"⚠️ Clínica {clinica_id} não encontrada.")
        except Exception as e:
            print(f"❌ Erro DB ao buscar nome da clínica {clinica_id}: {e}")
        return "Clínica"

async def _executar_fluxo_mensagem(clinica_id: str, instancia_id: str, instancia_nome: str, numero: str, texto: str, push_name: str, msg_raw: Optional[dict] = None, channel_type: str = "BAILEYS"):
    # 1. Thread ID único por conversa (LangGraph cuida do histórico no Redis)
    thread_id = f"{clinica_id}:{numero}"
    config    = {"configurable": {"thread_id": thread_id}}

    # 2. Buscar paciente para contexto
    paciente = await db.paciente_por_telefone(clinica_id, f"+{numero}")
    
    # 3. Obter o grafo (Singleton)
    graph = await get_graph()

    # 4. Estado inicial e Estabilização de Sessão
    clinica_nome = await get_clinica_nome(clinica_id)
    
    # Lógica de resete: se inactividade > 30min, limpamos o histórico
    last_act_key = f"last_activity:{thread_id}"
    last_ts = await _redis.get(last_act_key)
    
    # IMPORTANTE: Usar LUANDA_TZ (UTC+1) explicitamente para evitar mismatch de timezone no Railway/Local
    agora = datetime.now(LUANDA_TZ).timestamp()
    timeout = 1800 # 30 min
    
    force_reset = False
    if last_ts:
        diff = agora - float(last_ts)
        print(f"⏱️ DEBUG Sessão {numero}: agora={agora}, last_ts={last_ts}, diff={diff}s (timeout={timeout}s)")
        
        if diff > timeout:
            print(f"🔄 Sessão expirada para {numero} (>{timeout/60}min). Forçando resete.")
            force_reset = True
        
        # Check se a sessão anterior foi marcada como finalizada (contextual)
        if existing_state and existing_state.values.get("is_session_finished"):
            print(f"🏁 Sessão anterior de {numero} estava finalizada. Iniciando novo contexto.")
            force_reset = True
        elif diff < -60:
            # Proteção contra relógios dessincronizados (se o tempo 'voltou' mais de 1 min)
            print(f"⚠️ Relógio dessincronizado detectado para {numero}. Corrigindo timestamp.")
    
    await _redis.set(last_act_key, str(agora))
    
    # Compressão de Histórico (Regra 7) — Só corre se não for reset
    existing_state = await graph.aget_state(config)
    if existing_state and existing_state.values and not force_reset:
        mensagens_existentes = existing_state.values.get("messages", [])
        if len(mensagens_existentes) > 6:
            print(f"🗜️ Comprimindo histórico para {numero}...")
            messages_comprimidas = await comprimir_historico(mensagens_existentes, clinica_nome)
            
            # Limpar o histórico atual usando IDs
            delete_msgs = [RemoveMessage(id=m.id) for m in mensagens_existentes if getattr(m, "id", None)]
            
            try:
                # Atualizar o State na DB: apagar todas + injetar o sumário e as recentes limpas
                await graph.aupdate_state(config, {"messages": delete_msgs + messages_comprimidas})
            except Exception as e:
                print(f"⚠️ Falha na compressão (IDs inválidos?): {e}")
                # Fallback: tentar apenas injetar as mensagens comprimidas sem apagar (acumula, mas não crasha)
                await graph.aupdate_state(config, {"messages": messages_comprimidas})

    state_update = {
        "messages": [HumanMessage(content=texto)],
        "last_activity_ts": datetime.now(timezone.utc).isoformat()
    }

    # Só injetamos o estado completo no primeiro turno ou num force_reset.
    # Caso contrário, o LangGraph fará OVERWRITE das chaves (apagando slots e intenção da memória pesistida).
    if not existing_state or not existing_state.values or force_reset:
        state_update.update({
            "tenant_id":         clinica_id,
            "whatsapp_number":   numero,
            "patient_id":        paciente.id if paciente else None,
            "patient_name":      paciente.nome if paciente else push_name,
            "clinic_config":     {},
            "llm_provider":      "groq",  # Default provider
            "intent":            None,
            "collected_slots":   {},
            "missing_slots":     [],
            "requires_human":    False,
            "conversation_stage": "greeting",
            "turn_count":        0,
            "channel":           channel_type,
        })

    if force_reset and existing_state and existing_state.values:
        # Enviar RemoveMessage para todas as mensagens anteriores
        old_msgs = existing_state.values.get("messages", [])
        delete_cmds = [RemoveMessage(id=m.id) for m in old_msgs if getattr(m, "id", None)]
        if delete_cmds:
            try:
                await graph.aupdate_state(config, {"messages": delete_cmds})
            except Exception as e:
                print(f"⚠️ Falha ao resetar mensagens: {e}")

    # 5. Invocar o grafo
    # Nota: LangGraph gere o histórico via AsyncPostgresSaver (definido no lifespan do main.py)
    resultado = await graph.ainvoke(state_update, config=config)

    # 6. Extrair última mensagem do agente para enviar ao WhatsApp
    mensagens_ai = [
        m for m in resultado["messages"]
        if hasattr(m, "content") and not isinstance(m, HumanMessage)
        and getattr(m, "content", "") # Evitar mensagens vazias/tool_calls intermédios
    ]

    if mensagens_ai:
        # A última mensagem do AI é a resposta final para o turno
        resposta_texto = mensagens_ai[-1].content
        print(f"🤖 Resposta AI para {numero}: {resposta_texto[:50]}...")
        
        # Prioritizar UI Payload estruturado (Meta Cloud)
        final_state = await app.aget_state(config)
        ui_payload = final_state.values.get("ui_payload")
        
        payload_to_send = ui_payload if ui_payload else resposta_texto

        # Enviar de volta ao Gateway Node.js
        node_api = os.environ.get("API_PUBLIC_URL", "http://localhost:3001/api")
        internal_key = os.environ.get("TS_API_INTERNAL_KEY", "intel_shared_secret_789456123")
        
        import httpx
        async with httpx.AsyncClient() as client:
            try:
                res = await client.post(
                    f"{node_api}/whatsapp/internal/enviar",
                    json={
                        "instanciaId": instancia_id,
                        "telefone": numero,
                        "mensagem": payload_to_send
                    },
                    headers={"Authorization": f"Bearer {internal_key}"}
                )
                res.raise_for_status()
            except Exception as e:
                print(f"❌ Erro ao enviar resposta via Gateway: {e}")

    # 7. Registar custo operacional no Redis
    await cost_tracker.registar(
        clinica_id=clinica_id,
        agente="total",
        modelo="mixed",
        input_tokens=resultado.get("tokens_usados", 0),
        output_tokens=0,
    )

    print(f"✅ Fluxo LangGraph concluído para {numero}. Custos: ${resultado.get('custo_estimado_usd', 0):.4f}")

async def processar_mensagem(payload: dict):
    try:
        instancia = payload.get("instance")
        event = payload.get("event")
        data = payload.get("data", {})
        
        print(f"📩 Webhook recebido: {instancia} - Evento: {event}")

        ids = await db.resolver_ids_por_instancia(instancia)
        if not ids: 
            print(f"⚠️ Instância {instancia} não encontrada na DB.")
            return
        clinica_id, instancia_id = ids["clinicaId"], ids["instanciaId"]

        if not await db.is_ia_ativo(clinica_id, instancia_id): 
            print(f"ℹ️ IA Assistant inativo para {instancia}. Ignorando.")
            return

        if event == "messages.upsert":
            # Evolution API varies: some engines send a 'messages' array in 'data',
            # others send the message object directly in 'data'.
            msg = None
            if isinstance(data, dict):
                if "messages" in data and isinstance(data["messages"], list) and len(data["messages"]) > 0:
                    msg = data["messages"][0]
                elif "key" in data:
                    msg = data
            
            if not msg:
                print(f"⚠️ Evento messages.upsert recebido mas estrutura de mensagem não reconhecida. Chaves: {list(data.keys()) if isinstance(data, dict) else 'non-dict'}")
                return
            
            if msg.get("key", {}).get("fromMe"): return
            
            key = msg.get("key", {})
            remote_id = key.get("remoteJid", "")
            if not remote_id:
                print(f"⚠️ Mensagem sem 'remoteJid' (msg structure: {list(msg.keys()) if isinstance(msg, dict) else 'non-dict'})")
                return
                
            numero = remote_id.split("@")[0]
            message = msg.get("message", {})
            
            # Extract text safely (handles multiple message types)
            texto = (
                message.get("conversation") or 
                message.get("extendedTextMessage", {}).get("text") or
                message.get("buttonsResponseMessage", {}).get("selectedButtonId") or
                message.get("listResponseMessage", {}).get("singleSelectReply", {}).get("selectedRowId")
            )
            
            if not texto and message.get("pollUpdateMessage"):
                # Handle poll update inside UPSERT
                try:
                    votes = message.get("pollUpdateMessage", {}).get("vote", {}).get("selectedOptions", [])
                    if votes:
                        texto = votes[0]
                except:
                    pass
            
            push_name = msg.get("pushName", "")
            
            if not texto: 
                print(f"ℹ️ Mensagem sem texto legível de {numero}. Tipo: {list(message.keys())}")
                return
            
            msg_id = msg["key"]["id"]
            if await ja_processado(msg_id): 
                print(f"ℹ️ Mensagem {msg_id} duplicada. Ignorando.")
                return
            
            print(f"🤖 A processar: '{texto[:20]}...' de {numero}")
            
            try:
                async with session_lock(clinica_id, numero):
                    await _executar_fluxo_mensagem(clinica_id, instancia_id, instancia, numero, texto, push_name, msg)
            except TimeoutError:
                print(f"❌ Timeout ao obter lock para {numero}. Possível sobrecarga.")
                await evo_client.enviar_texto(instancia, numero, "Desculpe, estou a processar muitas mensagens. Pode repetir, por favor?")

    except Exception as e:
        import traceback
        print(f"💥 ERRO CRÍTICO no processamento de mensagem: {str(e)}")
        traceback.print_exc()

from pydantic import BaseModel

class ClinicaMessage(BaseModel):
    clinicaId: str
    instanciaId: str
    channel: str
    telefone: str
    nomeContato: str
    messageType: str
    value: str
    messageId: str
    timestamp: str

@router.post("/webhook/unified")
async def webhook_unified(payload: ClinicaMessage, background_tasks: BackgroundTasks):
    try:
        # A API Node.js já fez a validação e limpeza
        clinica_id = payload.clinicaId
        numero = payload.telefone
        texto = payload.value
        push_name = payload.nomeContato
        instancia = payload.instanciaId
        
        # Deduplicação baseada no ID unificado
        if await ja_processado(payload.messageId): 
            print(f"ℹ️ Mensagem {payload.messageId} duplicada. Ignorando.")
            return {"status": "ignored"}
            
        print(f"🤖 [UNIFIED GATEWAY] A processar: '{texto[:20]}...' de {numero} via {payload.channel}")
        
        async def processar_unified_task():
            try:
                async with session_lock(clinica_id, numero):
                    await _executar_fluxo_mensagem(clinica_id, payload.instanciaId, instancia, numero, texto, push_name, None, payload.channel)
            except Exception as e:
                print(f"❌ Erro ao processar mensagem unificada: {e}")

        background_tasks.add_task(processar_unified_task)
        return {"status": "ok"}
    except Exception as e:
        print(f"🔥 Erro no endpoint Unified Webhook: {e}")
        return {"status": "error", "message": str(e)}

async def processar_poll_update(clinica_id: str, instancia_id: str, instancia: str, data: Any):
    # Handle Poll updates (Evolution v2)
    # data can be a list or a single update object
    updates = data if isinstance(data, list) else [data]
    for update in updates:
        poll_update = update.get("update", {}).get("pollUpdates")
        if poll_update:
            numero = update["key"]["remoteJid"].split("@")[0]
            texto = _extrair_voto_poll(update)
            if texto:
                print(f"📊 Voto em Poll detectado: {texto} de {numero}")
                try:
                    async with session_lock(clinica_id, numero):
                        await _executar_fluxo_mensagem(clinica_id, instancia_id, instancia, numero, texto, "", update)
                except Exception as e:
                    print(f"💥 Erro ao processar poll: {e}")
            break

@router.post("/webhook/whatsapp")
async def webhook_whatsapp(request: Request, background_tasks: BackgroundTasks, x_evolution_hmac: str = Header(None)):
    try:
        body = await request.body()
        if not validar_hmac(body, x_evolution_hmac):
            print("❌ HMAC Inválido no Webhook")
            raise HTTPException(status_code=401, detail="HMAC inválido")
        
        payload = json.loads(body)
        instancia = payload.get("instance")
        event = payload.get("event")
        
        if event not in ["messages.upsert", "messages.update"]:
            return {"status": "ignored"}
        
        # Simple deduplication and rate limit check (Layer 1&2)
        data = payload.get("data", {})
        numero = None
        if event == "messages.upsert":
            numero = data.get("messages", [{}])[0].get("key", {}).get("remoteJid", "").split("@")[0]
        elif event == "messages.update":
            # For poll updates, data might be a list
            sample = data[0] if isinstance(data, list) and len(data) > 0 else (data if isinstance(data, dict) else {})
            numero = sample.get("key", {}).get("remoteJid", "").split("@")[0]

        if numero:
            if await rate_limit_excedido(instancia, numero):
                print(f"⚠️ Rate limit atingido para {numero} na instância {instancia}")
                return {"status": "ratelimit"}

        if event == "messages.upsert":
            background_tasks.add_task(processar_mensagem, payload)
        elif event == "messages.update":
            # Resolve IDs early for background task
            ids = await db.resolver_ids_por_instancia(instancia)
            if ids:
                background_tasks.add_task(processar_poll_update, ids["clinicaId"], ids["instanciaId"], instancia, data)
        
        return {"status": "ok"}
    except Exception as e:
        print(f"🔥 Erro no endpoint Webhook: {e}")
        # Return 200 anyway to avoid Evolution API retries if logical error
        return {"status": "error", "message": str(e)}
