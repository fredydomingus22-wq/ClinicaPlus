import asyncio
from typing import List, Dict, Any
from db.layer import ClinicaDB
from lib.evolution_client import EvolutionClient

async def lembrete_proactivo_job():
    """
    Job that sends confirmation polls for appointments in the next 48h.
    Runs daily at 08:00 Luanda.
    """
    print("🔔 Iniciando job de lembretes proactivos...")
    db = ClinicaDB()
    evo = EvolutionClient()
    
    try:
        agendamentos: List[Dict[str, Any]] = await db.obter_agendamentos_para_lembrete(48)
        if not agendamentos:
            print("ℹ️ Nenhum agendamento pendente de confirmação para as próximas 48h.")
            return

        for ag in agendamentos:
            # Format message
            data_hora = ag["dataHora"]
            dia_str = data_hora.strftime("%d/%m")
            hora_str = data_hora.strftime("%H:%M")
            
            pergunta = (
                f"Olá {ag['paciente_nome']}! 👋\n\n"
                f"Lembramos da sua consulta com o(a) *{ag['medico_nome']}*:\n"
                f"📅 *{dia_str}* às *{hora_str}*\n\n"
                "Pode confirmar a sua presença?"
            )
            opcoes = ["✅ Confirmar", "❌ Cancelar", "🔄 Reagendar"]
            
            # Send poll (Evolution API)
            print(f"🚀 Enviando lembrete para {ag['telefone']} (Agendamento: {ag['id']})")
            await evo.enviar_poll(
                instance=ag["instancia_nome"],
                numero=ag["telefone"],
                pergunta=pergunta,
                opcoes=opcoes
            )
            
        print(f"✅ Job de lembretes concluído. Total enviados: {len(agendamentos)}")
    except Exception as e:
        print(f"❌ Erro no job lembrete_proactivo: {e}")
