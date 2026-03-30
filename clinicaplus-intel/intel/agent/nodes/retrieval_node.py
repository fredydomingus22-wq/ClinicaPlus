# intel/agent/nodes/retrieval_node.py
import json
from datetime import datetime, timedelta
from intel.agent.state import ConversaState
from db_layer import db, LUANDA_TZ, WaFormatter

async def retrieval_node(state: ConversaState) -> dict:
    """
    Retrieval Node: Procura proativamente dados na DB com base na intenção.
    Garante isolamento de tenant usando o clinica_id do estado.
    """
    clinica_id = state["clinica_id"]
    intencao   = state.get("intencao", "outro")
    esp_nome   = state.get("especialidade")
    paciente_id= state.get("paciente_id")
    
    dados_recuperados = {}

    # 1. Recuperar sempre Especialidades Activas (bom para contexto geral)
    # Cache local no nó para evitar DB spam? Por agora direto.
    especialidades = await db.especialidades_activas(clinica_id)
    dados_recuperados["especialidades_disponiveis"] = especialidades

    # 2. Se a intenção for MARCAR e tivermos uma especialidade
    if intencao == "marcar" and esp_nome:
        medicos = await db.medicos_por_especialidade(clinica_id, esp_nome)
        if medicos:
            dados_recuperados["medicos_na_especialidade"] = [
                {"id": m.id, "nome": m.nome, "preco": m.preco} for m in medicos
            ]
            
            # Tentar buscar slots para o primeiro médico (ou sugerir se for vago)
            amanha = (datetime.now(LUANDA_TZ) + timedelta(days=1)).date()
            slots = await db.slots_disponiveis(clinica_id, medicos[0].id, data_alvo=amanha)
            if slots:
                dados_recuperados["proximos_horarios_livres"] = [
                    {"medico": s.medicoNome, "dataHora": s.dataHora.isoformat()} 
                    for s in slots[:4]
                ]

    # 3. Se o paciente estiver identificado, buscar agendamentos futuros
    if paciente_id:
        proximos = await db.proximos_agendamentos_paciente(clinica_id, paciente_id)
        if proximos:
            dados_recuperados["agendamentos_paciente"] = [
                {"id": a.id, "data": a.dataHora.isoformat(), "medico": a.medicoNome, "estado": a.estado}
                for a in proximos
            ]
            
        # Buscar estatísticas de no-show para o agente ser mais assertivo
        stats = await db.stats_no_show_paciente(clinica_id, paciente_id)
        dados_recuperados["perfil_paciente_stats"] = stats

    # 4. Informação da Clínica (Horários/Localização básico de exemplo)
    # TODO: No futuro, estes dados viriam da tabela configuracoes_clinica
    dados_recuperados["horario_geral"] = "Segunda a Sexta: 08:00 - 18:00"

    print(f"🔍 Retrieval concluído para {intencao}: {list(dados_recuperados.keys())}")

    return {
        "clinica_dados": dados_recuperados
    }
