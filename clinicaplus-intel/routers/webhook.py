from datetime import datetime, date, timedelta, timezone
import hmac
import hashlib
import json
import os
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Depends, Header
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

LUANDA = timezone(timedelta(hours=1))

router = APIRouter()
evo_client = EvolutionClient()
db = ClinicaDB()
dst = DialogueStateTracker()
policy = DialoguePolicy()
nlg = NLGGenerator()

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

async def _executar_fluxo_mensagem(clinica_id: str, instancia_id: str, instancia_nome: str, numero: str, texto: str, push_name: str, msg_raw: Optional[dict] = None):
    # 1. Fetch State
    conversa = await db.obter_conversa(clinica_id, instancia_id, numero)
    estado = DialogueState() if not conversa else DialogueState(**conversa.contexto)

    # 1.5 Cache Layer
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
    
    # 4. Policy (Dynamic slots)
    if novo_estado.proximo_slot_em_falta() == "slotHorario" and novo_estado.especialidade and novo_estado.data_iso:
        try:
            data_alvo = date.fromisoformat(novo_estado.data_iso)
        except:
            data_alvo = (datetime.now(LUANDA) + timedelta(days=1)).date()

        if novo_estado.medicoId:
            slots = await db.slots_por_regra(clinica_id, novo_estado.medicoId, data_alvo)
        else:
            meds_esp = [m for m in medicos if m.get("especialidade") == novo_estado.especialidade]
            slots = []
            for m in meds_esp:
                mslots = await db.slots_por_regra(clinica_id, m["id"], data_alvo, limite=3)
                slots.extend(mslots)
            slots.sort(key=lambda s: s.dataHora)
            
        opcoes_nlu["slots"] = slots
        
    decisao = policy.decidir(novo_estado, accoes_dst, None, opcoes_nlu)
    
    # 5. NLG & Send
    template_nome = decisao.template_mensagem
    
    if decisao.accao == "MOSTRAR_OPCOES":
        pergunta, opcoes = nlg.get_opcoes_poll(template_nome, decisao.dados_extra)
        if decisao.slot_alvo == "slotHorario":
            # Format slots as poll
            slots = decisao.dados_extra.get("slots", [])
            poll_payload = WaFormatter.slots_como_poll(slots)
            pergunta, opcoes = poll_payload["pergunta"], poll_payload["opcoes"]
        
        await evo_client.enviar_poll(instancia_nome, numero, pergunta, opcoes)
    
    elif decisao.accao == "CRIAR_AGENDAMENTO":
        # Predict No-show
        sinais = {
            "lead_time": (datetime.fromisoformat(novo_estado.slotHorario).date() - date.today()).days if novo_estado.slotHorario else 1,
            "hora": int(novo_estado.slotHorario[11:13]) if novo_estado.slotHorario else 9
        }
        risco = predictor.predizer(sinais)
        decisao.dados_extra["scoreNoShow"] = risco
        
        # Confirmation
        msg_txt = nlg.gerar_resposta("confirmacao_final", decisao.dados_extra)
        await evo_client.enviar_texto(instancia_nome, numero, msg_txt)
        
        # Here would go the TS API call in production
        # await criar_agendamento(...)
        
    else:
        # Standard text message
        msg_txt = nlg.gerar_resposta(template_nome, decisao.dados_extra)
        await evo_client.enviar_texto(instancia_nome, numero, msg_txt)

    # 6. Save State
    novo_estado.ultimaAccao = decisao.accao
    await db.actualizar_conversa(clinica_id, instancia_id, numero, novo_estado, push_name)
    print(f"✅ Fluxo concluído para {numero}. Acção: {decisao.accao}")

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
            # Evolution v2 often nest messages in 'messages' array
            msg = data.get("messages", [{}])[0]
            if msg.get("key", {}).get("fromMe"): return
            
            numero = msg["key"]["remoteJid"].split("@")[0]
            message = msg.get("message", {})
            
            # Extract text (handles multiple message types)
            texto = (
                message.get("conversation") or 
                message.get("extendedTextMessage", {}).get("text") or
                message.get("buttonsResponseMessage", {}).get("selectedButtonId") or
                message.get("listResponseMessage", {}).get("singleSelectReply", {}).get("selectedRowId")
            )
            push_name = msg.get("pushName", "")
            
            if not texto: 
                print(f"ℹ️ Mensagem sem texto de {numero}. Ignorando.")
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
