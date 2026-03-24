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

        # 5. Confirmações
        elif template_nome == "confirmacao_final":
            # Final message handled by WaFormatter, but keeping template for fallback/intro
            return "Ótimo! Vou confirmar o seu agendamento..."

        elif template_nome == "confirmado":
            return "Tudo certo! Receberá a notificação oficial em breve."
            
        elif template_nome == "confirmar_unico_slot":
            return "Só temos um horário disponível."

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
            
        # Add other poll templates here if necessary
        return "", []
