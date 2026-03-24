from typing import Dict, Any, Tuple
from dataclasses import dataclass

@dataclass
class SinaisRisco:
    taxa_noshow_historica: float = 0.0
    lead_time_dias: int = 0
    primeira_consulta: bool = False
    hora_consulta: int = 12
    total_cancelamentos: int = 0
    marcou_via_whatsapp: bool = False
    respondeu_lembrete: bool = False

class HeuristicaNoShow:
    """Preditor Heurístico (Fase 0) calibrado para Angola."""
    
    def calcular_score(self, sinais: SinaisRisco) -> Dict[str, Any]:
        score = 0.0
        raciocinio = []
        
        # 1. Taxa histórica (maior peso)
        if sinais.taxa_noshow_historica > 0:
            peso_hist = sinais.taxa_noshow_historica * 0.45
            score += peso_hist
            raciocinio.append(f"Histórico ({peso_hist:.2f})")
            
        # 2. Lead time
        if sinais.lead_time_dias > 30:
            score += 0.20
            raciocinio.append("Lead time > 30 (+0.20)")
        elif sinais.lead_time_dias > 14:
            score += 0.12
            raciocinio.append("Lead time > 14 (+0.12)")
            
        # 3. Primeira consulta
        if sinais.primeira_consulta:
            score += 0.10
            raciocinio.append("Primeira consulta (+0.10)")
            
        # 4. Hora <= 8h (Cedo em Luanda tem mais faltas por trânsito)
        if sinais.hora_consulta <= 8:
            score += 0.10
            raciocinio.append("Cedo <= 8h (+0.10)")
            
        # 5. Cancelamentos
        if sinais.total_cancelamentos >= 3:
            score += 0.12
            raciocinio.append("Cancelamentos >= 3 (+0.12)")
            
        # 6. Factores protectores
        if sinais.marcou_via_whatsapp:
            score -= 0.06
            raciocinio.append("Marcou WhatsApp (-0.06)")
            
        if sinais.respondeu_lembrete:
            score -= 0.25
            raciocinio.append("Respondeu Lembrete (-0.25)")
            
        # Normalizar 0 a 1
        score = max(0.0, min(1.0, score))
        
        # Classificação e Acções
        nivel = "BAIXO"
        tipo_lembrete = "STANDARD"
        enviar_segundo = False
        
        if score >= 0.65:
            nivel = "ALTO"
            tipo_lembrete = "URGENTE"
            enviar_segundo = True
        elif score >= 0.35:
            nivel = "MEDIO"
            tipo_lembrete = "ATENCAO"
            enviar_segundo = False
            
        return {
            "score": score,
            "nivel": nivel,
            "tipo_lembrete": tipo_lembrete,
            "enviar_segundo": enviar_segundo,
            "raciocinio": " | ".join(raciocinio) if raciocinio else "Sem risco detectado"
        }
