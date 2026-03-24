from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from nlu.pipeline import NLUResult

@dataclass
class DialogueState:
    especialidade:  Optional[str] = None
    medicoId:       Optional[str] = None
    medicoNome:     Optional[str] = None
    data_iso:       Optional[str] = None
    dataLabel:      Optional[str] = None
    periodo:        Optional[Dict[str, Any]] = None
    slotHorario:    Optional[str] = None
    slotLabel:      Optional[str] = None
    pacienteId:     Optional[str] = None
    turno:          int = 0
    erros:          int = 0
    ultimaAccao:    Optional[str] = None
    caminhoSlots:   List[str] = field(default_factory=list)

    def proximo_slot_em_falta(self) -> Optional[str]:
        """Returns the first missing mandatory slot in order."""
        for slot in ["especialidade", "data_iso", "slotHorario"]:
            if getattr(self, slot) is None:
                # Normalizing return names for Policy
                if slot == "data_iso": return "data"
                return slot
        return None

    def esta_completo(self) -> bool:
        """Checks if all mandatory slots for an appointment are filled."""
        return all([self.especialidade, self.data_iso, self.slotHorario])

class DialogueStateTracker:
    def actualizar(
        self, 
        estado: DialogueState, 
        nlu: NLUResult, 
        opcoes: Dict[str, Any]
    ) -> tuple[DialogueState, List[str]]:
        """
        Updates the dialogue state with new information from NLU.
        Returns the updated state and a list of internal actions detected.
        """
        accoes = []
        teve_progresso = False
        
        # 1. Update turns
        estado.turno += 1
        
        # 2. Handle immediate intent actions
        if nlu.intencao == "RESET":
            accoes.append("RESET_SOLICITADO")
            # Don't return yet, let it clear if needed (Policy handles actual reset)
            
        if nlu.intencao == "AJUDA":
            accoes.append("AJUDA_SOLICITADA")
            
        if nlu.intencao == "URGENTE" or nlu.urgente:
            if "URGENCIA_DETECTADA" not in accoes:
                accoes.append("URGENCIA_DETECTADA")
                teve_progresso = True

        # 3. Confirmation intent handling
        if estado.ultimaAccao == "AGUARDA_CONFIRMACAO":
            if nlu.intencao == "AFIRMACAO":
                accoes.append("CONFIRMACAO:AFIRMACAO")
                teve_progresso = True
            elif nlu.intencao == "NEGACAO":
                accoes.append("CONFIRMACAO:NEGACAO")
                teve_progresso = True

        # 4. Slot Merging (Slots never go backwards)
        slots_para_checar = {
            "especialidade": nlu.especialidade,
            "medicoId":      nlu.medico_id,
            "data_iso":      nlu.data_iso,
            "periodo":       nlu.periodo,
        }
        
        for slot_name, val in slots_para_checar.items():
            if val is not None and getattr(estado, slot_name) is None:
                setattr(estado, slot_name, val)
                teve_progresso = True
                accoes.append(f"SLOT_{slot_name.upper()}_PREENCHIDO")
                
                # If we got a doctor, we might also get their name/specialty
                if slot_name == "medicoId" and opcoes.get("medicos"):
                    med_info = next((m for m in opcoes["medicos"] if m["id"] == val), None)
                    if med_info:
                        estado.medicoNome = med_info.get("nome")
                        if not estado.especialidade:
                            estado.especialidade = med_info.get("especialidade")

        # 5. Handle POLL choices (Direct matching if it's a known slotHorario format)
        # NLU usually handles this already by providing data_iso or especialidade
        # but if it was a final confirmation poll:
        if nlu.intencao == "AFIRMACAO" and "CONFIRMACAO:AFIRMACAO" not in accoes:
             if estado.ultimaAccao == "AGUARDA_CONFIRMACAO":
                 accoes.append("CONFIRMACAO:AFIRMACAO")
                 teve_progresso = True

        # 6. Error tracking
        if nlu.intencao not in ["AFIRMACAO", "NEGACAO", "RESET", "AJUDA"] and not teve_progresso:
            estado.erros += 1
            accoes.append("INPUT_NAO_RECONHECIDO")
        else:
            # RESET errors if we had progress
            estado.erros = 0
            
        return estado, accoes
