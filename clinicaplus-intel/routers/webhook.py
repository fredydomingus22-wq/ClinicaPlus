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

    # Assuming we get the clinicaId implicitly by matching the instanceName (ADR-014 rules)
    # The instance name from Evolution should map directly to clinicaId
    clinica_id = instancia 

    # Extract message details
    mensagens = data.get("messages", [])
    if not mensagens: return
    
    msg = mensagens[0]
    if msg.get("key", {}).get("fromMe"): 
        return # Ignore outgoing messages
        
    remote_jid = msg.get("key", {}).get("remoteJid", "")
    numero = remote_jid.split("@")[0]
    push_name = msg.get("pushName")
    
    message_content = msg.get("message", {})
    
    texto = ""
    # Extract text from standard message or poll update
    if "conversation" in message_content:
        texto = message_content["conversation"]
    elif "extendedTextMessage" in message_content:
        texto = message_content["extendedTextMessage"].get("text", "")
    elif "pollUpdateMessage" in message_content:
        # User voted in a poll
        votos = message_content["pollUpdateMessage"].get("voters", [])
        # Very simplified poll abstraction; typically evolution gives the optionName mapped
        # Assuming the pipeline gets the selected string or we map it before
        # In a real scenario, decrypt poll votes. Here we assume we get the raw text 
        # for simplicity or rely on an already decrypted text field if Evolution provides it.
        texto = msg.get("messageType") # Needs specific Evolution parser
        pass
        
    if not texto:
        return

    # 1. Fetch State
    conversa = await db.obter_conversa(clinica_id, instancia, numero)
    estado = DialogueState() if not conversa else DialogueState(**conversa.contexto)
    
    # Pre-fetch context options
    medicos = await db.todos_medicos_activos(clinica_id)
    especialidades = await db.especialidades_activas(clinica_id)
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

    # Offload processing to background
    background_tasks.add_task(processar_mensagem, payload)
    
    return {"status": "ok", "message": "Webhook received"}
