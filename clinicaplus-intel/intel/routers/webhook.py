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

async def _executar_fluxo_mensagem(clinica_id: str, instancia_id: str, instancia_nome: str, numero: str, texto: str, push_name: str, msg_raw: Optional[dict] = None):
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
    agora = datetime.now().timestamp()
    timeout = 1800 # 30 min
    
    force_reset = False
    if last_ts and (agora - float(last_ts)) > timeout:
        print(f"🔄 Sessão expirada para {numero} (>30min). Forçando resete.")
        force_reset = True
    
    await _redis.set(last_act_key, str(agora))
    
    # Compressão de Histórico (Regra 7) — Só corre se não for reset
    existing_state = await graph.aget_state(config)
    if existing_state and existing_state.values and not force_reset:
        mensagens_existentes = existing_state.values.get("messages", [])
        if len(mensagens_existentes) > 6:
            print(f"🗜️ Comprimindo histórico para {numero}...")
            messages_comprimidas = await comprimir_historico(mensagens_existentes, clinica_nome)
            
            # Limpar o histórico atual usando IDs (o checkpointer aceita RemoveMessage se tivermos add_messages reducer)
            delete_msgs = [RemoveMessage(id=m.id) for m in mensagens_existentes if getattr(m, "id", None)]
            
            # Atualizar o State na DB: apagar todas + injetar o sumário e as recentes limpas
            await graph.aupdate_state(config, {"messages": delete_msgs + messages_comprimidas})

    initial_state = {
        "messages":          [HumanMessage(content=texto)],
        "tenant_id":         clinica_id,
        "clinica_nome":      clinica_nome,
        "numero_wa":         numero,
        "paciente_id":       paciente.id if paciente else None,
        "paciente_nome":     paciente.nome if paciente else push_name,
        "turno":             0,
        "max_turnos":        10,
        "tokens_usados":     0,
        "custo_estimado_usd": 0.0,
        "clinic_config":     {}, # Preenchido pelo config_node
        "clinica_dados":     None, # Preenchido pelo retrieval_node
    }

    if force_reset and existing_state and existing_state.values:
        # Enviar RemoveMessage para todas as mensagens anteriores
        old_msgs = existing_state.values.get("messages", [])
        delete_cmds = [RemoveMessage(id=m.id) for m in old_msgs if getattr(m, "id", None)]
        if delete_cmds:
            await graph.aupdate_state(config, {"messages": delete_cmds})

    # 5. Invocar o grafo
    # Nota: LangGraph gere o histórico via AsyncRedisSaver configurado em graph.py
    resultado = await graph.ainvoke(initial_state, config=config)

    # 6. Extrair última mensagem do agente para enviar ao WhatsApp
    mensagens_ai = [
        m for m in resultado["messages"]
        if hasattr(m, "content") and not isinstance(m, HumanMessage)
        and getattr(m, "content", "") # Evitar mensagens vazias/tool_calls intermédios
    ]

    if mensagens_ai:
        # A última mensagem do AI é a resposta final para o turno
        resposta = mensagens_ai[-1].content
        print(f"🤖 Resposta AI para {numero}: {resposta[:50]}...")
        await evo_client.enviar_texto(instancia_nome, numero, resposta)

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
