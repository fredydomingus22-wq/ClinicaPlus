import json
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from intel.agent.state import AgentState
from intel.agent.prompts.builder import SLOT_COLLECTOR_PROMPT

SLOTS_BY_INTENT = {
    "agendar":  ["specialty", "date", "time", "confirmation"],
    "cancelar": ["appointment_reference", "cancellation_reason", "confirmation"]
}
MAX_SLOTS_PER_INTENT = 4

def check_slots_complete(state: AgentState) -> str:
    missing = state.get("missing_slots", [])
    if not missing:
        return "action_executor"
    return "slot_collector"

async def slot_collector(state: AgentState) -> dict:
    """Solicita a informação em falta ao paciente."""
    from db_layer import db, WaFormatter, LUANDA_TZ
    from datetime import datetime
    
    intent = state.get("intent", "")
    collected = state.get("collected_slots", {})
    required_slots = SLOTS_BY_INTENT.get(intent, [])
    
    missing = [s for s in required_slots if s not in collected or not collected[s]]
    next_missing = missing[0] if missing else ""
    
    turn_count = state.get("turn_count", 0)
    messages = state.get("messages", [])
    recent_msgs = [m for m in messages if isinstance(m, (HumanMessage, AIMessage)) and getattr(m, "content", "")]
    recent_text = "\n".join([f"{'Paciente' if isinstance(m, HumanMessage) else 'IA'}: {m.content}" for m in recent_msgs[-3:]])
    
    config = state.get("clinic_config", {})
    specialties = ", ".join(config.get("specialties", []))
    
    tenant_id = state.get("tenant_id")
    available_slots_info = "Nenhuma pesquisa de horários feita ainda."
    
    if intent == "agendar" and next_missing in ["date", "time"] and "specialty" in collected:
        try:
            from db_layer import db, LUANDA_TZ
            from datetime import datetime
            medicos = await db.medicos_por_especialidade(tenant_id, collected["specialty"])
            if medicos:
                # Usa o primeiro medico ativo dessa especialidade
                m = medicos[0]
                hoje = datetime.now(LUANDA_TZ).date()
                slots = await db.slots_disponiveis(tenant_id, m.id, data_alvo=hoje, limite=4)
                if slots:
                    available_slots_info = f"Horários mais próximos com Dr(a). {m.nome}:\n"
                    available_slots_info += "\n".join([f"- {s.dataHora.strftime('%d/%m às %H:%M')} ({s.preco} Kz)" for s in slots])
                else:
                    available_slots_info = f"Não encontrei vagas imediatas com Dr(a). {m.nome} para hoje."
            else:
                available_slots_info = f"Especialidade '{collected['specialty']}' não tem médicos activos no momento."
        except Exception as db_e:
            print(f"Aviso Slot Collector: falha ao buscar slots reais: {db_e}")
            pass
    elif intent == "cancelar" and next_missing == "appointment_reference":
        # Injeção directa de contexto (Python -> Contexto) sem depender de ferramentas do LLM para busca
        patient_data = state.get("patient_data", {})
        agendamentos = patient_data.get("agendamentos", [])
        if agendamentos:
            available_slots_info = "CONTEXTO DE AGENDAMENTOS DO PACIENTE:\n"
            for i, ag in enumerate(agendamentos, 1):
                available_slots_info += f"- Referência {i}: {ag['texto']} (ID: {ag['id']})\n"
            available_slots_info += "\nInstrução: Oferece estas opções ao paciente. Ele pode escolher pelo número ou médico."
        else:
            available_slots_info = "Não foram encontrados agendamentos ativos para este paciente na base de dados."
    
    prompt = SLOT_COLLECTOR_PROMPT.format(
        intent=intent,
        collected_slots_json=json.dumps(collected, ensure_ascii=False),
        next_missing_slot=next_missing,
        available_specialties=specialties,
        available_slots_info=available_slots_info,
        turn_count=turn_count,
        reasoning_context=state.get("reasoning_context", "Sem raciocínio prévio."),
        booking_summary=json.dumps(collected, ensure_ascii=False),
        recent_messages=recent_text
    )
    
    try:
        from intel.agent.providers import get_llm
        llm = get_llm(state.get("llm_provider", "groq"))
        resp = await llm.ainvoke([HumanMessage(content=prompt)])
        ai_message = resp
    except Exception as e:
        import traceback
        print(f"ERROR no Slot Collector: {str(e)}")
        traceback.print_exc()
        
        # Fallback caso falhe o envio
        text = f"Para prosseguir, necessito de saber: {next_missing}."
        if next_missing == "specialty":
            text = f"Qual é a especialidade desejada? Temos: {specialties}"
        elif next_missing == "confirmation":
            text = "As informações estão correctas? Confirma por favor."
            
        ai_message = AIMessage(content=text)
        
    # 4. Geração de UI Nativas (META_CLOUD)
    ui_payload = None
    if state.get("channel") == "META_CLOUD":
        if next_missing == "specialty":
            especialidades = await db.especialidades_activas(tenant_id)
            if especialidades:
                ui_payload = WaFormatter.especialidades_meta_lista(especialidades)
        elif next_missing == "confirmation":
            ui_payload = WaFormatter.confirmacao_meta_botoes(ai_message.content)
        elif next_missing == "time":
             # Se chegámos aqui, specialty está em collected
             medicos = await db.medicos_por_especialidade(tenant_id, collected.get("specialty", ""))
             if medicos:
                 hoje = datetime.now(LUANDA_TZ).date()
                 slots = await db.slots_disponiveis(tenant_id, medicos[0].id, data_alvo=hoje, limite=10)
                 if slots:
                     ui_payload = WaFormatter.slots_meta_lista(slots)

    return {
        "missing_slots": missing,
        "messages": [ai_message],
        "ui_payload": ui_payload
    }
