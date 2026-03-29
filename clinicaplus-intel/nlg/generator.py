from typing import Dict, Any, List

class NLGGenerator:
    """Gerador de Linguagem Natural (Templates)"""

    def gerar_resposta(self, template_nome: str, dados: Dict[str, Any]) -> str:
        """Gera a mensagem de texto com base no template e nos dados fornecidos."""
        
        # 1. Boas-vindas / Reset
        if template_nome == "boas_vindas":
            push_name = dados.get("push_name", "paciente")
            return f"Olá {push_name}! Sou o assistente da ClínicaPlus.\nComo posso ajudar hoje? (Ex: Quero marcar uma consulta)"

        # 2. Ajuda / Erros
        elif template_nome == "humano":
            return "Vou transferir o seu atendimento para a nossa equipa humana. Por favor, aguarde um momento."

        # 2b. Agradecimento
        elif template_nome == "agradecimento":
            return "De nada! 😊 Se precisar de mais alguma coisa, estou aqui. Cuide-se!"

        # 3. Urgência
        elif template_nome == "urgencia":
            esp = dados.get("especialidade", "Clínica Geral")
            return (f"🚨 Deteitei que pode ser uma situação de emergência.\n"
                    f"A priorizar triagem para {esp}...\n\n"
                    f"*Se for muito grave, dirija-se imediatamente aos serviços de banco de urgência mais próximos.*")

        # 4. Slots (Listas geradas fora, o texto é só o intro se precisar, mas costuma ir no payload do poll)
        # However, WaFormatter handles poll formatting. NLG handles normal text.
        elif template_nome == "lista_especialidades":
            # Just an intro text, if used outside Poll
            return "Temos várias especialidades. Qual prefere?"

        elif template_nome == "lista_horarios":
            return "Encontrei estes horários disponíveis. Por favor, escolha um:"

        elif template_nome == "pergunta_data":
            return "Para quando deseja marcar a consulta? (Ex: Hoje, Amanhã, ou uma data como 25/03)"

        # 5. Confirmações
        elif template_nome == "confirmacao_pre":  # Pede confirmação ao paciente antes de criar
            esp = dados.get("especialidade", "")
            medico = dados.get("medicoNome", "")
            data_label = dados.get("dataLabel", "") or dados.get("data_iso", "")
            hora_label = dados.get("slotLabel", "") or dados.get("slotHorario", "")[:5] if dados.get("slotHorario") else ""
            return (
                f"📋 *Resumo do agendamento:*\n"
                f"🏥 Especialidade: {esp}\n"
                f"👨‍⚕️ Médico: {medico}\n"
                f"📅 Data: {data_label}\n"
                f"🕐 Hora: {hora_label}\n\n"
                f"Confirma este agendamento?"
            )

        elif template_nome == "confirmado" or template_nome == "confirmacao_final":
            esp = dados.get("especialidade", "")
            med = dados.get("medicoNome", "")
            data = dados.get("dataLabel", "") or dados.get("data_iso", "")
            hora = dados.get("slotLabel", "") or (dados.get("slotHorario", "")[:5] if dados.get("slotHorario") else "")
            return (f"✅ *Consulta Marcada com Sucesso!*\n\n"
                    f"🏥 Especialidade: *{esp}*\n"
                    f"👨‍⚕️ Médico: *{med}*\n"
                    f"📅 Data: *{data}*\n"
                    f"🕐 Hora: *{hora}*\n\n"
                    f"Chegue com 15 min de antecedência. Até lá! 👋")

        # 6. Paciente Reconhecido (Proactivo)
        elif template_nome == "agendamento_ativo":
            nome = dados.get("nome", "Paciente")
            ag = dados.get("agendamento", {})
            esp = ag.get("medicoEsp", "Consulta")
            med = ag.get("medicoNome", "Médico")
            try:
                dt_obj = datetime.fromisoformat(ag.get("dataHora", ""))
                dt_label = dt_obj.strftime("%d/%m às %H:%M")
            except:
                dt_label = ag.get("dataHora", "")
            
            return (f"Olá {nome}! 👋\n\n"
                    f"Identifiquei que tem uma consulta marcada:\n"
                    f"🏥 *{esp}*\n"
                    f"👨‍⚕️ *{med}*\n"
                    f"📅 *{dt_label}*\n\n"
                    f"Como posso ajudar?")

        elif template_nome == "confirmacao_presenca_sucesso":
            return "Excelente! 👌 A sua presença foi confirmada no sistema. Esperamos por si!"

        elif template_nome == "reagendar_inicio":
            return "Com certeza. Vamos encontrar um novo horário. Para quando deseja reagendar?"
            
        elif template_nome == "confirmar_unico_slot":
            slot = dados.get("slot")
            if slot and hasattr(slot, "dataHora"):
                from datetime import timezone, timedelta
                LUANDA = timezone(timedelta(hours=1))
                dt = slot.dataHora.astimezone(LUANDA)
                hora_str = dt.strftime("%H:%M")
                data_str = dt.strftime("%d/%m")
                return f"Só existe um horário disponível: *{data_str} às {hora_str}*. Confirma?"
            return "Só existe um horário disponível. Confirma?"

        # 6. Fallback Alternativas
        elif template_nome == "sem_slots_alternativas":
            return "Infelizmente não há vagas para essa data. Temos estas alternativas disponíveis:"
            
        elif template_nome == "alternativas_pos_recusa":
            return "Sem problema. Que tal um destes horários?"

        elif template_nome == "sugestao_repetir":
            return "Vi que a sua última consulta foi X. Deseja marcar novamente?"

        # Fallback genérico
        return "Desculpe, pode repetir a sua resposta?"

    def get_opcoes_poll(self, template_nome: str, dados: Dict[str, Any]) -> tuple[str, List[str]]:
        """Gera a pergunta e a lista de opções para usar num WhatsApp Poll."""
        if template_nome == "lista_especialidades":
            opcoes = dados.get("opcoes", [])
            return "Para qual especialidade deseja marcar a consulta?", opcoes
            
        elif template_nome == "pergunta_data":
            opcoes = dados.get("opcoes", ["Hoje", "Amanhã"])
            return "Para que dia deseja marcar?", opcoes

        elif template_nome in ["confirmacao_pre", "confirmar_unico_slot"]:
            # Poll de confirmação Sim/Não
            return "Confirma o agendamento?", ["✅ Confirmar", "❌ Cancelar"]
            
        # Add other poll templates here if necessary
        return "", []
