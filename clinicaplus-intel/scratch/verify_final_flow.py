import asyncio
import os
import sys
import json
from langchain_core.messages import HumanMessage
sys.path.append(os.getcwd())
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from dotenv import load_dotenv
load_dotenv()

from intel.agent.nodes.patient_identifier import patient_identifier
from intel.agent.nodes.slot_collector import slot_collector

async def verify_flow():
    state = {
        "tenant_id": "cmnnltdix00002wuxf6pngmzp", # ID real da clinica do teste
        "whatsapp_number": "None", # O paciente do teste tem telefone None (devemos casar por ID no teste manual ou mocks)
        "messages": [HumanMessage(content="Quero cancelar a minha consulta")],
        "intent": "cancelar",
        "collected_slots": {},
        "missing_slots": ["appointment_reference"],
        "llm_provider": "gemini_25_flash",
        "patient_id": "cmnnlty6j000d2wuxy3secww1", # ID real do paciente do teste
        "clinic_config": {"name": "Clinica Teste", "specialties": ["Geral"]}
    }
    
    print("\n--- TESTE 1: IDENTIFICAÇÃO ---")
    # Nota: patient_identifier usa wa_number, mas aqui já passamos o ID para simular identificação
    # Vamos forçar o patient_identifier a rodar para popular o patient_data
    # No código real, se patient_id existe ele retorna {}
    # Vamos mockar o comportamento de encontrar o paciente mas forçar o carregamento dos agendamentos
    
    from db_layer import db
    paciente = await db.paciente_por_id(state["tenant_id"], state["patient_id"])
    agendamentos = await db.proximos_agendamentos_paciente(state["tenant_id"], state["patient_id"])
    
    from db_layer import fmt_dt
    state["patient_data"] = {
        "perfil": {"nome": paciente.nome, "telefone": paciente.telefone, "alergias": paciente.alergias},
        "agendamentos": [{
            "id": a.id,
            "texto": f"{fmt_dt(a.dataHora)} com {a.medicoNome} ({a.medicoEsp})"
        } for a in agendamentos]
    }
    
    print(f"Agendamentos carregados: {len(state['patient_data']['agendamentos'])}")
    
    print("\n--- TESTE 2: SLOT COLLECTOR ---")
    result = await slot_collector(state)
    
    msg = result["messages"][0].content
    print(f"RESPOSTA DO ASSISTENTE:\n{msg}")
    
    if "test_33464acd" in msg or "1." in msg:
        print("\n✅ SUCESSO: O assistente reconheceu os agendamentos!")
    else:
        print("\n❌ FALHA: O assistente ignorou a lista de agendamentos.")

if __name__ == "__main__":
    asyncio.run(verify_flow())
