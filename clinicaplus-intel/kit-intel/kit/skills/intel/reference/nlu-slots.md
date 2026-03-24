# Reference: NLU — Intenções, Slots, Aliases

## Intenções suportadas

| Intenção | Trigger | Score típico |
|----------|---------|-------------|
| MARCAR | Qualquer mensagem sobre consulta | 60–87% |
| URGENTE | Palavras de urgência | 92% |
| AFIRMACAO | sim, s, ok, claro, vá, tá, certo | 100% |
| NEGACAO | não, nao, n, no, nunca, negativo | 100% |
| NUMERO | Resposta numérica isolada (legado) | 100% |
| CANCELAR | cancelar, desmarcar, anular | 90% |
| REAGENDAR | remarcar, reagendar, adiar | 88% |
| AJUDA | ajuda, help, humano, atendente | 95% |
| RESET | oi, olá, iniciar (≤ 2 palavras) | 90% |

**Regra crítica:** AFIRMACAO, NEGACAO, RESET, AJUDA não extraem slots.
Parar o pipeline de extracção imediatamente depois de classificar a intenção.

## Slots do domínio

| Slot | Tipo | Obrigatório | Como extrair |
|------|------|-------------|-------------|
| especialidade | categórico | ✅ | aliases + TF-IDF fuzzy |
| medicoId | entidade | ❌ | nome no texto (só se "dr/dra" presente) |
| data | temporal | ✅ | parser nativo pt-AO |
| periodo | categórico soft | ❌ | word boundary regex |
| slotHorario | selecção | ✅ | escolhido via Poll |

## Aliases pt-AO completos

```python
ALIASES = {
    # Cardiologia
    "cardio":"Cardiologia", "cardiologia":"Cardiologia",
    "coração":"Cardiologia", "coracao":"Cardiologia",
    # Pediatria
    "pedia":"Pediatria", "pediatria":"Pediatria",
    "criança":"Pediatria", "crianca":"Pediatria",
    "filho":"Pediatria", "filha":"Pediatria",
    "bebé":"Pediatria", "bebe":"Pediatria",
    # Ortopedia
    "orto":"Ortopedia", "ortopedia":"Ortopedia",
    "joelho":"Ortopedia", "coluna":"Ortopedia", "osso":"Ortopedia",
    "perna":"Ortopedia", "braço":"Ortopedia",
    # Clínica Geral
    "geral":"Clínica Geral", "clinica geral":"Clínica Geral",
    "clínica geral":"Clínica Geral",
    # Dermatologia
    "derma":"Dermatologia", "pele":"Dermatologia",
    # Neurologia
    "neuro":"Neurologia", "cabeça":"Neurologia", "cabeca":"Neurologia",
    # Ginecologia
    "gineco":"Ginecologia", "ginecologia":"Ginecologia",
}
```

## Thresholds de confiança

| Matcher | Threshold | Razão |
|---------|-----------|-------|
| Match de especialidade (TF-IDF) | 0.32 | Evitar matches em textos genéricos |
| Match de médico (TF-IDF) | 0.55 | Alto — evitar médico errado |
| Sinal obrigatório para match médico | "dr","dra","doutor" | Só tentar se há referência explícita |

## Parser de datas pt-AO

Expressões suportadas sem depender de strings em inglês:
- `amanhã` / `amanha` → timedelta(days=1)
- `hoje` → data actual
- `depois de amanhã` → timedelta(days=2)
- `semana que vem` / `próxima semana` → timedelta(weeks=1)
- `esta semana` → amanhã como proxy
- Dias da semana: `segunda`, `terça`, `quarta`, `quinta`, `sexta`, `sábado`, `domingo`
- Datas explícitas: `25/03`, `25-03`, `25 de março`

## Períodos do dia (com word boundary)

```python
PERIODOS_ORDENADOS = sorted([
    ("de manhã",(7,12)), ("bem cedo",(7,9)), ("manhã",(7,12)), ("manha",(7,12)),
    ("à tarde",(13,18)), ("a tarde",(13,18)), ("tarde",(13,18)),
    ("almoço",(12,14)), ("noite",(18,21)), ("cedo",(7,10)),
], key=lambda x: -len(x[0]))  # mais longos primeiro — evita "manhã" dentro de "amanhã"

# Usar regex com \b para não capturar substring
if re.search(r'\b' + re.escape(kw) + r'\b', texto_lower):
    return periodo
```

## Casos de teste obrigatórios

```python
# O caso concreto — deve funcionar perfeitamente
assert analisar("quero marcar consulta de cardio para amanhã").especialidade == "Cardiologia"
assert analisar("quero marcar consulta de cardio para amanhã").data_iso is not None

# Aliases
assert analisar("quero marcar pro coração").especialidade == "Cardiologia"
assert analisar("consulta de criança").especialidade == "Pediatria"
assert analisar("tenho problema na coluna").especialidade == "Ortopedia"

# Período — sem capturar "manhã" dentro de "amanhã"
r = analisar("marcar para amanhã de tarde")
assert r.periodo["label"] == "tarde"
assert r.data_iso is not None  # amanhã também extraído

# Sem slots espúrios em afirmação/negação
r = analisar("sim")
assert r.intencao == "AFIRMACAO"
assert r.especialidade is None

# Médico só com sinal explícito
r = analisar("quero marcar cardio")
assert r.medico_id is None  # sem "dr/dra" → não tentar match

r = analisar("quero a dra ana para quinta")
assert r.medico_id == "med-2"
assert r.data_iso is not None

# Urgência respeita especialidade inferida
r = analisar("minha filha tem febre alta")
assert r.intencao == "URGENTE"
assert r.especialidade == "Pediatria"  # não sobrepor com Clínica Geral
```
