import re
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Tuple
from datetime import date, timedelta, datetime
import pytz
from rapidfuzz import process, fuzz

# ── CONSTANTS ──────────────────────────────────────────────────────────────────

THRESHOLD_ESPECIALIDADE = 60  # Equivalent to ~0.32 TF-IDF
THRESHOLD_MEDICO = 55         # Spec: 0.55

ALIASES = {
    "cardio": "Cardiologia", "cardiologia": "Cardiologia",
    "coração": "Cardiologia", "coracao": "Cardiologia",
    "pedia": "Pediatria", "pediatria": "Pediatria",
    "criança": "Pediatria", "crianca": "Pediatria",
    "filho": "Pediatria", "filha": "Pediatria",
    "bebé": "Pediatria", "bebe": "Pediatria",
    "orto": "Ortopedia", "ortopedia": "Ortopedia",
    "joelho": "Ortopedia", "coluna": "Ortopedia", "osso": "Ortopedia",
    "perna": "Ortopedia", "braço": "Ortopedia",
    "geral": "Clínica Geral", "clinica geral": "Clínica Geral",
    "clínica geral": "Clínica Geral",
    "derma": "Dermatologia", "pele": "Dermatologia",
    "neuro": "Neurologia", "cabeça": "Neurologia", "cabeca": "Neurologia",
    "gineco": "Ginecologia", "ginecologia": "Ginecologia",
}

PERIODOS_ORDENADOS = sorted([
    ("de manhã", {"inicio": 7, "fim": 12, "label": "manhã"}),
    ("bem cedo", {"inicio": 7, "fim": 9, "label": "manhã"}),
    ("manhã", {"inicio": 7, "fim": 12, "label": "manhã"}),
    ("manha", {"inicio": 7, "fim": 12, "label": "manhã"}),
    ("à tarde", {"inicio": 13, "fim": 18, "label": "tarde"}),
    ("a tarde", {"inicio": 13, "fim": 18, "label": "tarde"}),
    ("tarde", {"inicio": 13, "fim": 18, "label": "tarde"}),
    ("almoço", {"inicio": 12, "fim": 14, "label": "almoço"}),
    ("noite", {"inicio": 18, "fim": 21, "label": "noite"}),
    ("cedo", {"inicio": 7, "fim": 10, "label": "cedo"}),
], key=lambda x: -len(x[0]))

@dataclass
class NLUResult:
    """Represents the interpreted intention and extracted slots from a message."""
    intencao: str
    conf: float = 0.9
    especialidade: Optional[str] = None
    medico_id: Optional[str] = None
    data_iso: Optional[str] = None
    periodo: Optional[Dict[str, Any]] = None
    urgente: bool = field(default=False)

# ── PURE FUNCTIONS ─────────────────────────────────────────────────────────────

def get_data(texto: str) -> Optional[str]:
    """Parses Portuguese (Angola) date expressions into ISO strings."""
    agora = date.today()
    texto = texto.lower()
    
    if "amanhã" in texto or "amanha" in texto:
        return (agora + timedelta(days=1)).isoformat()
    if "hoje" in texto:
        return agora.isoformat()
    if "depois de amanhã" in texto or "depois de amanha" in texto:
        return (agora + timedelta(days=2)).isoformat()
    if "semana que vem" in texto or "próxima semana" in texto or "proxima semana" in texto:
        return (agora + timedelta(weeks=1)).isoformat()
    
    dias_semana = {
        "segunda": 0, "terça": 1, "terca": 1, "quarta": 2, 
        "quinta": 3, "sexta": 4, "sábado": 5, "sabado": 5, "domingo": 6
    }
    for dia, val in dias_semana.items():
        if dia in texto:
            days_ahead = val - agora.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return (agora + timedelta(days=days_ahead)).isoformat()

    # Explicit dates: 25/03, 25-03, 25 de março
    match = re.search(r'(\d{1,2})[/-](\d{1,2})', texto)
    if match:
        day, month = int(match.group(1)), int(match.group(2))
        try:
            return date(agora.year, month, day).isoformat()
        except ValueError: pass
        
    meses = {
        "janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3, "abril": 4, "maio": 5, "junho": 6,
        "julho": 7, "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12
    }
    for mes_nome, mes_val in meses.items():
        match = re.search(rf'(\d{{1,2}})\s+de\s+{mes_nome}', texto)
        if match:
            day = int(match.group(1))
            return date(agora.year, mes_val, day).isoformat()
            
    return None

def get_periodo(texto: str) -> Optional[Dict[str, Any]]:
    """Identifies the time period of the day using word boundaries."""
    texto = texto.lower()
    for kw, p_val in PERIODOS_ORDENADOS:
        if re.search(r'\b' + re.escape(kw) + r'\b', texto):
            return p_val
    return None

def extrair_especialidade(texto: str, disponiveis: List[str] = None) -> Optional[str]:
    """Extracts specialty using direct aliases or fuzzy matching."""
    texto = texto.lower()
    for alias, formal in ALIASES.items():
        if re.search(r'\b' + re.escape(alias) + r'\b', texto):
            return formal
            
    if disponiveis:
        match = process.extractOne(texto, disponiveis, scorer=fuzz.WRatio)
        if match and match[1] >= THRESHOLD_ESPECIALIDADE:
            return match[0]
    return None

def get_medico(texto: str, medicos: List[Dict] = None) -> Tuple[Optional[str], Optional[str]]:
    """Extracts doctor ID and specialty if explicit titles are present."""
    texto = texto.lower()
    if not any(w in texto for w in ["dr", "dra", "doutor", "doutora"]):
        return None, None
        
    if medicos:
        # Use lowercase for matching for better consistency
        lookup = {m["nome"].lower(): m for m in medicos}
        match = process.extractOne(texto, list(lookup.keys()), scorer=fuzz.WRatio)
        if match and match[1] >= THRESHOLD_MEDICO:
            found_med = lookup[match[0]]
            return found_med["id"], found_med.get("especialidade")
    return None, None

# ── MAIN PIPELINE ──────────────────────────────────────────────────────────────

def analisar(texto: str, medicos: List[Dict] = None, especialidades: List[str] = None) -> NLUResult:
    """Main NLU pipeline that transforms text into an NLUResult."""
    texto = texto.strip()
    texto_lower = texto.lower()
    
    # 1. Immediate Intents (Short messages)
    if re.fullmatch(r'(sim|s|ok|claro|vá|tá|certo|confirmar|vambora)', texto_lower):
        return NLUResult(intencao="AFIRMACAO")
    if re.fullmatch(r'(não|nao|n|no|nunca|negativo|cancelar)', texto_lower):
        return NLUResult(intencao="NEGACAO")
    if re.fullmatch(r'(ajuda|help|humano|atendente)', texto_lower):
        return NLUResult(intencao="AJUDA")
    if len(texto.split()) <= 2 and re.search(r'\b(oi|olá|ola|iniciar|recomeçar|recomecar)\b', texto_lower):
        return NLUResult(intencao="RESET")

    # 2. Main Intent Classification
    intencao = "MARCAR"
    urgente = False
    if any(w in texto_lower for w in ["urgente", "emergência", "urgencia", "emergencia", "dor", "febre", "mal"]):
        intencao = "URGENTE"
        urgente = True
    
    if any(w in texto_lower for w in ["cancelar", "desmarcar", "anular"]):
        intencao = "CANCELAR"
    elif any(w in texto_lower for w in ["remarcar", "reagendar", "adiar"]):
        intencao = "REAGENDAR"

    # 3. Slot Extraction
    esp_match = extrair_especialidade(texto_lower, especialidades)
    med_id, med_esp = get_medico(texto_lower, medicos)
    
    if med_id:
        especialidade = med_esp if not esp_match else esp_match
    else:
        especialidade = esp_match

    # Urgency heuristic
    if intencao == "URGENTE" and not especialidade:
        if any(w in texto_lower for w in ["filha", "filho", "bebe", "bebé", "criança", "crianca"]):
            especialidade = "Pediatria"
        else:
            especialidade = "Clínica Geral"

    return NLUResult(
        intencao=intencao,
        especialidade=especialidade,
        medico_id=med_id,
        data_iso=get_data(texto_lower),
        periodo=get_periodo(texto_lower),
        urgente=urgente
    )
