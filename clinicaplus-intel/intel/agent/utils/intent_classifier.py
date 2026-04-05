import re

# Padrões Regex Expandidos e Pesados (Angola context & WhatsApp habits)
INTENT_PATTERNS = {
    "agendar": [
        r"\b(vagas?|disponibilidade|horarios?|marcar|agendar|reservar|consulta|triagem|baixa)\b",
        r"\b(tem|têm|consegue|conseguem|teria|teriam)\s+vagas?\b",
        r"\b(preciso|quero|gostaria|queria)\s+de\s+(marcar|agendar|uma\s+vaga)\b",
        r"\btirar\s+vaga\b",
        r"\bestar\s+with\s+o\s+médico\b"
    ],
    "cancelar": [
        r"\b(cancelar|desmarcar|anular|remover|adiar|mudar\s+data)\b",
        r"\b(não|nao)\s+\b(virei|vou|posso|conseguirei)\s+\b(conseguir|ir|aparecer)\b"
    ],
    "humano": [
        r"\b(pessoa|atendente|recepcionista|humano|atendimento\s+real|falar\s+com\s+pessoal)\b",
        r"\b(falar\s+com|chamar|passar\s+para)\s+\b(alguém|humanos?|atendente|pessoa|recepção|recepcao)\b"
    ],
    "saudacao": [
        r"\b(olá|ola|oi|bom\s+dia|boa\s+tarde|boa\s+noite|tudo\s+bem|como\s+vai|saudações|viva|estás\s+fixe|kamba|madié|madiè|mambo)\b",
        r"^(hey|ei|boas|saudações|saudacoes)$"
    ]
}

def _jaccard_similarity(s1: str, s2: str) -> float:
    """Calcula a similaridade entre duas strings usando Jaccard (Sets de Bigramas)."""
    if not s1 or not s2: return 0.0
    s1, s2 = s1.lower(), s2.lower()
    if s1 == s2: return 1.0
    
    # Criar bi-gramas
    def get_ngrams(text):
        return set(text[i:i+2] for i in range(len(text)-1))
    
    set1, set2 = get_ngrams(s1), get_ngrams(s2)
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    return intersection / union if union > 0 else 0.0

def identify_intent_python(message: str, specialties: list[str] = None) -> tuple[str, float]:
    """
    Motor NLU Híbrido em Python:
    1. Usa Regex Pesado (Keywords/Slang).
    2. Usa Fuzzy Matching para Typos.
    3. Dá peso extra se houver menção a especialidades reais da clínica.
    """
    if not message:
        return "desconhecido", 0.0

    msg_clean = message.lower().strip()
    words = msg_clean.split()
    
    scores = {
        "agendar": 0.0,
        "cancelar": 0.0,
        "humano": 0.0,
        "saudacao": 0.0
    }

    # 1. Matches de Regex (Pesos base)
    for intent, patterns in INTENT_PATTERNS.items():
        for p in patterns:
            if re.search(p, msg_clean, re.IGNORECASE):
                scores[intent] += 1.0 # Match directo dá grande peso

    # 2. Sensibilidade a Especialidades (Pesadíssimo para 'agendar')
    if specialties:
        for specialty in specialties:
            spec_clean = specialty.lower()
            # Match directo da especialidade
            if spec_clean in msg_clean:
                scores["agendar"] += 1.5
            else:
                # Match fuzzy com as palavras da mensagem (para lidar com "pedatra")
                for word in words:
                    if len(word) > 4 and _jaccard_similarity(word, spec_clean) > 0.7:
                        scores["agendar"] += 1.2
                        break

    # 3. Fuzzy Matching de Intenções (para palavras comando)
    commands = {
        "agendar": ["marcar", "agendar", "vaga", "consulta"],
        "cancelar": ["cancelar", "desmarcar", "anular"],
        "humano": ["pessoa", "atendente", "atendimento"]
    }
    
    for intent, cmds in commands.items():
        for cmd in cmds:
            for word in words:
                if len(word) > 4 and _jaccard_similarity(word, cmd) > 0.8:
                    scores[intent] += 0.6

    # Escolher o vencedor
    top_intent = max(scores, key=scores.get)
    max_score = scores[top_intent]
    
    # Normalizar confiança (Simulação de confiança 0.0 a 1.0)
    # Se max_score >= 1.0, estamos bastante seguros.
    confidence = min(max_score / 1.5, 1.0)
    
    if max_score < 0.4:
        return "desconhecido", 0.0

    # Lógica especial para Saudações Curtas (Skip LLM total)
    if top_intent == "saudacao" and len(words) <= 3 and max_score >= 0.8:
        return "saudacao", 1.0

    return top_intent, confidence
