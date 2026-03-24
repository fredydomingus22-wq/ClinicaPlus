import hmac
import hashlib
import json
import os
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Depends
from nlu.pipeline import analisar, NLUResult
from dst.tracker import DialogueStateTracker, DialogueState
from policy.dialogue_policy import DialoguePolicy
from nlg.generator import NLGGenerator
from lib.evolution_client import EvolutionClient
from db.layer import ClinicaDB, WaFormatter
from noshow.predictor import predictor
from noshow.heuristica import SinaisRisco
from lib.session_lock import session_lock
from lib.dedup import ja_processado
from lib.rate_limiter import rate_limit_excedido
from lib.cache import get_especialidades, set_especialidades, get_medicos_activos, set_medicos_activos


router = APIRouter()
evo_client = EvolutionClient()
db = ClinicaDB()
dst = DialogueStateTracker()
policy = DialoguePolicy()
nlg = NLGGenerator()

WEBHOOK_SECRET = os.environ.get("EVOLUTION_WEBHOOK_SECRET", "")

def validar_hmac(request_body: bytes, header_hmac: str) -> bool:
    if not WEBHOOK_SECRET or not header_hmac:
        return False
    esperado = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        request_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(esperado, header_hmac)

async def processar_mensagem(payload: dict):
    # Payload structure based on Evolution API (MESSAGES_UPSERT)
    event_type = payload.get("event")
    data = payload.get("data", {})
    instancia = payload.get("instance")
    
    if event_type != "messages.upsert":
        return

    # 3. Session Lock (Layer 3)
    # We resolve clinica_id from instance name for the lock key
    clinica_id = instancia
    
    messages = data.get("messages", [])
    if not messages: return
    msg = messages[0]
    remote_jid = msg.get("key", {}).get("remoteJid", "")
    numero = remote_jid.split("@")[0]
    
    async with session_lock(clinica_id, numero):
        # The rest of the logic goes inside the lock
        await _executar_fluxo_mensagem(clinica_id, instancia, msg, payload)

async def _executar_fluxo_mensagem(clinica_id: str, instancia: str, msg: dict, payload: dict):
    # Extract message details
    push_name = msg.get("pushName")
    message_content = msg.get("message", {})
    numero = msg.get("key", {}).get("remoteJid", "").split("@")[0]
    
    # Ignore outgoing messages
    if msg.get("key", {}).get("fromMe"): 
        return 
    
    texto = ""
    # Extract text (simplificado)
    if "conversation" in message_content:
        texto = message_content["conversation"]
    elif "extendedTextMessage" in message_content:
        texto = message_content["extendedTextMessage"].get("text", "")
    
    if not texto: return

    # 1. Fetch State
    conversa = await db.obter_conversa(clinica_id, instancia, numero)
    estado = DialogueState() if not conversa else DialogueState(**conversa.contexto)
    
    # 1.5 Cache Layer (Layer 4)
    medicos = await get_medicos_activos(clinica_id)
    if not medicos:
        medicos = await db.todos_medicos_activos(clinica_id)
        await set_medicos_activos(clinica_id, medicos)
        
    especialidades = await get_especialidades(clinica_id)
    if not especialidades:
        especialidades = await db.especialidades_activas(clinica_id)
        await set_especialidades(clinica_id, especialidades)
    
    opcoes_nlu = {"medicos": medicos, "especialidades": especialidades}

    
    # 2. NLU
    nlu_res = analisar(texto, medicos=medicos, especialidades=especialidades)
    
    # 3. DST
    novo_estado, accoes_dst = dst.actualizar(estado, nlu_res, opcoes_nlu)
    
    # 4. Policy (Needs dynamic slots if missing)
    if novo_estado.proximo_slot_em_falta() == "slotHorario" and novo_estado.especialidade and novo_estado.data_iso:
        # Fetch slots before policy
        slots = await db.slots_por_regra(clinica_id, novo_estado.medicoId, novo_estado.data_iso)
        opcoes_nlu["slots"] = slots
        
    decisao = policy.decidir(novo_estado, accoes_dst, None, opcoes_nlu)
    
    # 5. NLG & Send
    template_nome = decisao.template_mensagem
    
    if decisao.accao == "MOSTRAR_OPCOES":
        pergunta, opcoes = nlg.get_opcoes_poll(template_nome, decisao.dados_extra)
        if decisao.slot_alvo == "slotHorario":
            # Formatting slots as poll options
            slots = decisao.dados_extra.get("slots", [])
            pergunta = "Escolhe o horário:"
            opcoes = [s.dataHora.strftime("%H:%M") for s in slots]
            
        await evo_client.enviar_poll(instancia, numero, pergunta, opcoes)
        novo_estado.ultimaAccao = "AGUARDA_INPUT"
        
    elif decisao.accao == "CRIAR_AGENDAMENTO":
        # 11. Score no-show
        # Num cenário real obteríamos as stats do DB. Mock para TDD:
        sinais = SinaisRisco(
            taxa_noshow_historica=0.0,
            lead_time_dias=2,
            primeira_consulta=True,
            marcou_via_whatsapp=True
        )
        risco = predictor.predizer(sinais)
        decisao.dados_extra["risco"] = risco["nivel"]
        
        # Final integration step (API call to internal TS) passaria o "risco" no payload
        # Assuming success:
        msg_txt = nlg.gerar_resposta(template_nome, decisao.dados_extra)
        await evo_client.enviar_texto(instancia, numero, msg_txt)
        novo_estado.ultimaAccao = "AGENDADO"
        # Reset state after success or leave it to expire
        
    else:
         # Standard text message
         msg_txt = nlg.gerar_resposta(template_nome, decisao.dados_extra)
         await evo_client.enviar_texto(instancia, numero, msg_txt)
         novo_estado.ultimaAccao = decisao.accao

    # 6. Save State
    await db.actualizar_conversa(clinica_id, instancia, numero, novo_estado, push_name)


@router.post("/webhook/whatsapp")
async def webhook_whatsapp(request: Request, background_tasks: BackgroundTasks):
    body = await request.body()
    header_hmac = request.headers.get("x-evolution-hmac")
    
    if not validar_hmac(body, header_hmac):
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid HMAC signature")
        
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Layer 1: Rate Limiting
    instancia = payload.get("instance")
    data = payload.get("data", {})
    messages = data.get("messages", [])
    if messages:
        numero = messages[0].get("key", {}).get("remoteJid", "").split("@")[0]
        if numero and await rate_limit_excedido(instancia, numero):
            return {"status": "ok", "message": "Rate limit exceeded"}

    # Layer 2: Deduplication
    if messages:
        msg_id = messages[0].get("key", {}).get("id")
        if msg_id and await ja_processado(instancia, msg_id):
            return {"status": "ok", "message": "Duplicate message ignored"}

    # Offload processing to background
    background_tasks.add_task(processar_mensagem, payload)
    
    return {"status": "ok", "message": "Webhook received"}

