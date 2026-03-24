from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from dst.tracker import DialogueState

@dataclass
class PolicyDecision:
    accao: str
    template_mensagem: Optional[str] = None
    slot_alvo: Optional[str] = None
    dados_extra: Dict[str, Any] = field(default_factory=dict)

class DialoguePolicy:
    def decidir(
        self, 
        estado: DialogueState, 
        accoes_dst: List[str], 
        historico: Optional[Dict[str, Any]], 
        opcoes: Dict[str, Any]
    ) -> PolicyDecision:
        """
        Decides the next action based on the current state and detected intent actions.
        Implements priorities defined in ADR-014 and policy-rules.md.
        """
        # 1. URGENCY (Max priority)
        if "URGENCIA_DETECTADA" in accoes_dst:
            esp = estado.especialidade or "Clínica Geral"
            return PolicyDecision(
                accao="URGENCIA", 
                template_mensagem="urgencia",
                dados_extra={"especialidade": esp}
            )

        # 2. ENCAMINHAR HUMANO (Help or Too many errors)
        if "AJUDA_SOLICITADA" in accoes_dst or estado.erros >= 4:
            return PolicyDecision(
                accao="ENCAMINHAR_HUMANO",
                template_mensagem="humano"
            )

        # 3. RESET
        if "RESET_SOLICITADO" in accoes_dst:
            return PolicyDecision(
                accao="RESET",
                template_mensagem="boas_vindas"
            )

        # 4. CONFIRMATION HANDLING
        if estado.ultimaAccao == "AGUARDA_CONFIRMACAO":
            if "CONFIRMACAO:AFIRMACAO" in accoes_dst:
                return PolicyDecision(
                    accao="CRIAR_AGENDAMENTO",
                    template_mensagem="confirmado"
                )
            if "CONFIRMACAO:NEGACAO" in accoes_dst:
                # Logic for alternatives after refusal
                alts = self._calcular_alternativas(estado, opcoes.get("slots", []))
                return PolicyDecision(
                    accao="ALTERNATIVAS",
                    template_mensagem="alternativas_pos_recusa",
                    dados_extra={"alternativas": alts}
                )

        # 5. SUGGEST HISTORY (1st turn only)
        if estado.turno == 1 and historico and historico.get("ultimaMarcacao"):
            # Minimal check: if we have history, suggest it
            return PolicyDecision(
                accao="SUGERIR_HISTORICO",
                template_mensagem="sugestao_repetir",
                dados_extra={"historico": historico["ultimaMarcacao"]}
            )

        # 6. MISSING SLOTS
        proximo = estado.proximo_slot_em_falta()
        
        if proximo == "especialidade":
            return PolicyDecision(
                accao="MOSTRAR_OPCOES",
                template_mensagem="lista_especialidades",
                slot_alvo="especialidade",
                dados_extra={"opcoes": opcoes.get("especialidades", [])[:8]}
            )
            
        if proximo == "data":
            # Rule of unique doctor
            if not estado.medicoId:
                medicos_esp = [m for m in opcoes.get("medicos", []) 
                              if m.get("especialidade") == estado.especialidade]
                if len(medicos_esp) == 1:
                    estado.medicoId = medicos_esp[0]["id"]
                    estado.medicoNome = medicos_esp[0]["nome"]
                    # Slot medico filled automatically, proceed to data
            
            # If still missing med, should we ask? (usually specialities -> med -> data)
            # But prompt says esp -> data -> slotHorario. 
            # If esp has multiple medicos, we might need a step for med choice.
            # Module spec says: especialidade -> médico (opcional) -> data -> horário
            pass

        if proximo == "slotHorario":
            slots = opcoes.get("slots", [])
            if not slots:
                alts = self._calcular_alternativas(estado, [])
                return PolicyDecision(
                    accao="ALTERNATIVAS",
                    template_mensagem="sem_slots_alternativas",
                    dados_extra={"alternativas": alts}
                )
            
            if len(slots) == 1:
                # Rule of 1 slot: jump choice, ask for confirmation directly
                estado.slotHorario = slots[0].dataHora.isoformat() if hasattr(slots[0], 'dataHora') else slots[0]
                return PolicyDecision(
                    accao="CONFIRMAR",
                    template_mensagem="confirmar_unico_slot",
                    dados_extra={"slot": slots[0]}
                )

            return PolicyDecision(
                accao="MOSTRAR_OPCOES",
                template_mensagem="lista_horarios",
                slot_alvo="slotHorario",
                dados_extra={"slots": slots[:5]}
            )

        # 7. COMPLETE -> CONFIRM
        if estado.esta_completo():
            return PolicyDecision(
                accao="CONFIRMAR",
                template_mensagem="confirmacao_final"
            )

        # Default fallback (should not happen if proximo is well-defined)
        return PolicyDecision(
            accao="MOSTRAR_OPCOES",
            template_mensagem="lista_especialidades",
            slot_alvo="especialidade",
            dados_extra={"opcoes": opcoes.get("especialidades", [])[:8]}
        )

    def _calcular_alternativas(self, estado: DialogueState, todos_slots: List[Any]) -> List[Dict[str, Any]]:
        """Generates up to 3 alternatives when the original request is unavailable."""
        # This is a placeholder for the actual heuristic logic defined in Step 9
        return [
            {"label": "Amanhã às 09:00", "valor": "2026-03-25T09:00:00"},
            {"label": "Quinta às 14:00", "valor": "2026-03-26T14:00:00"}
        ]
