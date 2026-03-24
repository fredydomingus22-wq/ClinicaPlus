#!/usr/bin/env python3
"""
ClinicaPlus NLU v3 — parser de datas nativo pt-AO, sem dependência de strings EN.
"""
import re, json
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from typing import Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

LUANDA_TZ = timezone(timedelta(hours=1))
def agora(): return datetime.now(LUANDA_TZ)

MEDICOS = [
    {"id":"med-1","nome":"Dr. Carlos Mendes",   "especialidade":"Cardiologia"},
    {"id":"med-2","nome":"Dra. Ana Costa",      "especialidade":"Pediatria"},
    {"id":"med-3","nome":"Dr. João Silva",      "especialidade":"Ortopedia"},
    {"id":"med-4","nome":"Dra. Maria Teixeira", "especialidade":"Clínica Geral"},
    {"id":"med-5","nome":"Dr. Paulo Ferreira",  "especialidade":"Cardiologia"},
]
ESPECIALIDADES = [
    "Cardiologia","Pediatria","Ortopedia",
    "Clínica Geral","Ginecologia","Dermatologia","Neurologia",
]
ALIASES = {
    "cardio":"Cardiologia","cardiologia":"Cardiologia",
    "coração":"Cardiologia","coracao":"Cardiologia","coracão":"Cardiologia",
    "pedia":"Pediatria","pediatria":"Pediatria",
    "criança":"Pediatria","crianca":"Pediatria","filho":"Pediatria","filha":"Pediatria",
    "bebé":"Pediatria","bebe":"Pediatria","bebê":"Pediatria",
    "orto":"Ortopedia","ortopedia":"Ortopedia",
    "joelho":"Ortopedia","coluna":"Ortopedia","osso":"Ortopedia","perna":"Ortopedia",
    "geral":"Clínica Geral","clinica geral":"Clínica Geral","clínica geral":"Clínica Geral",
    "derma":"Dermatologia","pele":"Dermatologia","dermatologia":"Dermatologia",
    "neuro":"Neurologia","cabeça":"Neurologia","cabeca":"Neurologia","neurologia":"Neurologia",
    "gineco":"Ginecologia","ginecologia":"Ginecologia",
}
PERIODOS_ORDENADOS = sorted([
    ("de manhã",(7,12)),("bem cedo",(7,9)),("manhã",(7,12)),("manha",(7,12)),
    ("à tarde",(13,18)),("a tarde",(13,18)),("tarde",(13,18)),
    ("almoço",(12,14)),("almoco",(12,14)),("noite",(18,21)),("cedo",(7,10)),
], key=lambda x: -len(x[0]))

URGENCIA   = ["dor","urgente","emergência","emergencia","febre","acidente",
              "sangue","falta de ar","desmaio","grave","hoje mesmo"]
RESET_KW   = ["oi","olá","ola","iniciar","recomeçar","menu","início","inicio"]
CANCELAR   = ["cancelar","desmarcar","anular","não posso ir","nao posso ir"]
REAGENDAR  = ["remarcar","reagendar","adiar","mudar a consulta","trocar"]
AJUDA      = ["ajuda","help","não percebo","nao percebo","humano","atendente"]
INTENCOES_SEM_SLOTS = {"AFIRMACAO","NEGACAO","RESET","AJUDA"}
SINAIS_MEDICO = ["dr","dra","doutor","doutora","professor","prof"]

MESES_PT = {
    "janeiro":1,"fevereiro":2,"março":3,"marco":3,"abril":4,"maio":5,"junho":6,
    "julho":7,"agosto":8,"setembro":9,"outubro":10,"novembro":11,"dezembro":12,
}

# ── Fuzzy ──────────────────────────────────────────────────────────────────────
class Fuzzy:
    def __init__(self, corpus):
        self.corpus = corpus
        self.vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(2,3), min_df=1)
        self.mat = self.vec.fit_transform(corpus)
    def match(self, q, thr=0.30):
        try:
            s = cosine_similarity(self.vec.transform([q]), self.mat)[0]
            i = int(np.argmax(s))
            sc = float(s[i])
            if sc >= thr: return self.corpus[i], sc
        except: pass
        return None

_fesp = Fuzzy(ESPECIALIDADES)
_fmed = Fuzzy([m["nome"] for m in MEDICOS])

# ── Entidades ──────────────────────────────────────────────────────────────────
def get_esp(txt):
    t = txt.lower()
    for alias in sorted(ALIASES, key=len, reverse=True):
        if alias in t: return ALIASES[alias]
    m = _fesp.match(t, thr=0.32)
    return m[0] if m else None

def get_medico(txt):
    t = txt.lower()
    if not any(s in t for s in SINAIS_MEDICO): return None, 0.0
    t2 = re.sub(r"\bdr\.?\b|\bdra\.?\b|\bdoutor\b|\bdoutora\b","",t).strip()
    m = _fmed.match(t2, thr=0.55)
    if m:
        nome, sc = m
        med = next((x for x in MEDICOS if x["nome"]==nome), None)
        if med: return med, sc
    return None, 0.0

def _prox_dia_semana(dow_alvo: int, n: datetime) -> datetime:
    """Retorna a próxima ocorrência do dia da semana (0=seg)."""
    delta = (dow_alvo - n.weekday()) % 7
    if delta == 0: delta = 7  # já passou hoje → próxima semana
    return n + timedelta(days=delta)

def _label(d: datetime) -> str:
    dias  = ["segunda-feira","terça-feira","quarta-feira","quinta-feira",
             "sexta-feira","sábado","domingo"]
    meses = ["","janeiro","fevereiro","março","abril","maio","junho",
             "julho","agosto","setembro","outubro","novembro","dezembro"]
    return f"{dias[d.weekday()]}, {d.day} de {meses[d.month]}"

def get_data(txt: str):
    """
    Parser de datas nativo pt-AO — sem depender de 'tomorrow'/'today' strings.
    Lida com: amanhã, hoje, depois de amanhã, dias da semana, esta semana,
    semana que vem, datas explícitas (25/03, 25 de março).
    """
    n = agora()
    t = txt.lower()

    # ── Expressões relativas ───────────────────────────────────────────────────
    if re.search(r"\bdepois de amanhã\b|\bdepois de amanha\b", t):
        d = n + timedelta(days=2)
        return d.date().isoformat(), _label(d)

    if re.search(r"\bamanhã\b|\bamanha\b", t):
        d = n + timedelta(days=1)
        return d.date().isoformat(), _label(d)

    if re.search(r"\bhoje\b", t):
        return n.date().isoformat(), _label(n)

    # ── Semana que vem ─────────────────────────────────────────────────────────
    if re.search(r"\bsemana que vem\b|\bpróxima semana\b|\bproxima semana\b", t):
        d = n + timedelta(days=7)
        return d.date().isoformat(), _label(d)

    # ── Esta semana ────────────────────────────────────────────────────────────
    if re.search(r"\besta semana\b", t):
        # Retorna amanhã como proxy (dentro desta semana)
        d = n + timedelta(days=1)
        return d.date().isoformat(), _label(d)

    # ── Dias da semana ────────────────────────────────────────────────────────
    DIAS_DOW = [
        (r"\bsegunda[\-\s]?feira\b|\bsegunda\b(?!\s*vez)", 0),
        (r"\bterça[\-\s]?feira\b|\bterça\b|\bterca\b",     1),
        (r"\bquarta[\-\s]?feira\b|\bquarta\b",             2),
        (r"\bquinta[\-\s]?feira\b|\bquinta\b",             3),
        (r"\bsexta[\-\s]?feira\b|\bsexta\b",               4),
        (r"\bsábado\b|\bsabado\b",                         5),
        (r"\bdomingo\b",                                   6),
    ]
    for pattern, dow in DIAS_DOW:
        if re.search(pattern, t, re.I):
            d = _prox_dia_semana(dow, n)
            return d.date().isoformat(), _label(d)

    # ── Datas explícitas: 25/03, 25-03, 25 de março ───────────────────────────
    # formato DD/MM ou DD-MM
    m = re.search(r"\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-]\d{2,4})?\b", t)
    if m:
        try:
            dia, mes = int(m.group(1)), int(m.group(2))
            ano = n.year
            d = datetime(ano, mes, dia, tzinfo=LUANDA_TZ)
            if d.date() < n.date(): d = d.replace(year=ano+1)
            return d.date().isoformat(), _label(d)
        except: pass

    # formato "25 de março"
    m = re.search(r"\b(\d{1,2})\s+de\s+([a-záéíóúãõçà]+)\b", t)
    if m:
        try:
            dia = int(m.group(1))
            mes = MESES_PT.get(m.group(2).lower())
            if mes:
                ano = n.year
                d = datetime(ano, mes, dia, tzinfo=LUANDA_TZ)
                if d.date() < n.date(): d = d.replace(year=ano+1)
                return d.date().isoformat(), _label(d)
        except: pass

    return None, None

def get_periodo(txt):
    t = txt.lower()
    for kw,(a,b) in PERIODOS_ORDENADOS:
        if re.search(r'\b' + re.escape(kw) + r'\b', t):
            return {"label":kw,"inicio":a,"fim":b}
    return None

# ── NLUResult ──────────────────────────────────────────────────────────────────
@dataclass
class NLUResult:
    intencao:      str
    conf:          float
    especialidade: Optional[str]  = None
    medico_id:     Optional[str]  = None
    medico_nome:   Optional[str]  = None
    data_iso:      Optional[str]  = None
    data_label:    Optional[str]  = None
    periodo:       Optional[dict] = None
    urgente:       bool           = False
    debug:         dict           = field(default_factory=dict)
    def slots_ok(self):
        return [s for s,v in [("esp",self.especialidade),("med",self.medico_id),
                               ("data",self.data_iso),("periodo",self.periodo)] if v]
    def etapas_saltadas(self):
        e=[]
        if self.especialidade or self.medico_id: e.append("ESPECIALIDADE")
        if self.medico_id: e.append("MÉDICO")
        return e

def analisar(txt: str) -> NLUResult:
    t = txt.lower().strip()
    u = any(k in t for k in URGENCIA)
    if u:                                               intencao,conf="URGENTE",0.92
    elif re.match(r"^(sim|s|1|yes|ok|confirmo|claro|vá|va|tá|ta|certo)$",t): intencao,conf="AFIRMACAO",1.0
    elif re.match(r"^(não|nao|n|2|no|nunca|negativo)$",t):                   intencao,conf="NEGACAO",1.0
    elif re.match(r"^\d+$",t):                          intencao,conf="NUMERO",1.0
    elif any(k in t for k in CANCELAR):                intencao,conf="CANCELAR",0.9
    elif any(k in t for k in REAGENDAR):               intencao,conf="REAGENDAR",0.88
    elif any(k in t for k in AJUDA):                   intencao,conf="AJUDA",0.95
    elif any(k in t for k in RESET_KW) and len(t.split())<=2: intencao,conf="RESET",0.9
    else:                                              intencao,conf="MARCAR",0.60

    r = NLUResult(intencao=intencao, conf=conf, urgente=u)
    if intencao in INTENCOES_SEM_SLOTS: return r

    dbg={}
    esp = get_esp(txt)
    if esp:
        r.especialidade=esp; dbg["esp_via"]="alias" if any(a in t for a in ALIASES) else "tfidf"
        if intencao=="MARCAR": r.conf=max(r.conf,0.82)
    med,sc = get_medico(txt)
    if med:
        r.medico_id=med["id"]; r.medico_nome=med["nome"]
        if not r.especialidade: r.especialidade=med["especialidade"]; dbg["esp_de_medico"]=med["especialidade"]
        dbg["med_score"]=round(sc,2)
        if intencao=="MARCAR": r.conf=max(r.conf,0.87)
    di,dl = get_data(txt)
    if di: r.data_iso=di; r.data_label=dl; dbg["data"]=di
    p = get_periodo(txt)
    if p: r.periodo=p; dbg["periodo"]=p["label"]
    r.debug=dbg
    return r

# ── Testes ─────────────────────────────────────────────────────────────────────
def show(txt,r,ok=None):
    I={"MARCAR":"🟢","URGENTE":"🔴","CANCELAR":"🟠","REAGENDAR":"🟡",
       "AFIRMACAO":"🟢","NEGACAO":"🔴","RESET":"🔵","AJUDA":"🟣","NUMERO":"⚪"}
    st="" if ok is None else ("  ✅" if ok else "  ❌")
    print(f"\n  {'─'*60}")
    print(f"  📨  \"{txt}\"{st}")
    print(f"  {I.get(r.intencao,'⚫')}  {r.intencao:<14} {r.conf:.0%}")
    slots=[]
    if r.especialidade: slots.append(f"especialidade  →  \"{r.especialidade}\"")
    if r.medico_nome:   slots.append(f"médico         →  \"{r.medico_nome}\"")
    if r.data_iso:      slots.append(f"data           →  {r.data_iso}  (\"{r.data_label}\")")
    if r.periodo:       slots.append(f"período        →  {r.periodo['label']}  ({r.periodo['inicio']}h–{r.periodo['fim']}h)")
    if r.urgente:       slots.append("🚨 urgência")
    if slots:
        print(f"  SLOTS:")
        for s in slots: print(f"    ✓ {s}")
    print(f"  DECISÃO:")
    if r.urgente:
        esp_ur=r.especialidade or "Clínica Geral"
        print(f"    → URGÊNCIA · {esp_ur} · slots de hoje")
    elif r.intencao=="MARCAR":
        s=r.etapas_saltadas()
        em_falta=[x for x in ["especialidade","data"] if x not in r.slots_ok() and x.replace("esp","especialidade")]
        falta_esp="esp" not in r.slots_ok() and not r.especialidade
        falta_data="data" not in r.slots_ok()
        if s: print(f"    → Saltadas: {' + '.join(s)}")
        filtro=r.data_iso or ""
        if filtro and r.periodo: filtro+=f" · {r.periodo['inicio']}h–{r.periodo['fim']}h"
        if filtro: print(f"    → Filtrar slots: {filtro}")
        if falta_esp: print(f"    → Poll: ESCOLHA_ESPECIALIDADE")
        elif falta_data: print(f"    → Poll: ESCOLHA_HORARIO  (pedir: data)")
        else: print(f"    → Confirmação directa")
    elif r.intencao=="AFIRMACAO": print(f"    → Criar agendamento")
    elif r.intencao=="NEGACAO":   print(f"    → Oferecer alternativas")
    elif r.intencao=="CANCELAR":  print(f"    → Fluxo cancelamento")
    elif r.intencao=="REAGENDAR": print(f"    → Fluxo reagendamento")
    elif r.intencao=="RESET":     print(f"    → Reiniciar fluxo")
    if r.debug: print(f"  debug: {json.dumps(r.debug,ensure_ascii=False)}")

TESTES = [
    ("O TEU CASO CONCRETO",[
        ("quero marcar consulta de cardio para amanhã","MARCAR","Cardiologia",True,None),
    ]),
    ("VARIAÇÕES",[
        ("quero marcar uma consulta de cardiologia amanhã de manhã","MARCAR","Cardiologia",True,"manhã"),
        ("quero cardio amanhã cedo","MARCAR","Cardiologia",True,"cedo"),
        ("marcar consulta de cardio para amanhã de tarde","MARCAR","Cardiologia",True,"tarde"),
        ("quero marcar pra amanhã com o dr carlos","MARCAR","Cardiologia",True,None),
    ]),
    ("ALIASES PT-AO",[
        ("quero marcar pro coração","MARCAR","Cardiologia",False,None),
        ("preciso de médico para o joelho","MARCAR","Ortopedia",False,None),
        ("consulta de criança para esta semana","MARCAR","Pediatria",True,None),
        ("bom dia, queria saber se tem consulta de pele disponível","MARCAR","Dermatologia",False,None),
        ("tenho problema na coluna","MARCAR","Ortopedia",False,None),
    ]),
    ("NOME DE MÉDICO",[
        ("quero a dra ana para quinta","MARCAR","Pediatria",True,None),
        ("marcar com dr paulo ferreira","MARCAR","Cardiologia",False,None),
        ("quero o dr carlos para amanhã de manhã","MARCAR","Cardiologia",True,"manhã"),
    ]),
    ("RESPOSTAS A POLLS",[
        ("Cardiologia","MARCAR","Cardiologia",False,None),
        ("Dr. Carlos Mendes","MARCAR","Cardiologia",False,None),
        ("terça-feira, 09:00","MARCAR",None,True,None),
    ]),
    ("URGÊNCIA",[
        ("tenho dor no peito urgente","URGENTE",None,False,None),
        ("minha filha tem febre alta preciso de médico hoje","URGENTE","Pediatria",False,None),
    ]),
    ("SEM SLOTS ESPÚRIOS",[
        ("sim","AFIRMACAO",None,False,None),
        ("não","NEGACAO",None,False,None),
        ("vá","AFIRMACAO",None,False,None),
        ("oi","RESET",None,False,None),
    ]),
    ("CANCELAR / REAGENDAR",[
        ("preciso cancelar a minha consulta","CANCELAR",None,False,None),
        ("quero desmarcar","CANCELAR",None,False,None),
        ("preciso remarcar para a semana que vem","REAGENDAR",None,True,None),
        ("tenho uma consulta marcada mas não posso ir","CANCELAR",None,False,None),
    ]),
]

def run():
    total=passed=0; falhas=[]
    for titulo,casos in TESTES:
        print(f"\n\n  {'═'*60}")
        print(f"  {titulo}")
        print(f"  {'═'*60}")
        for txt,exp_int,exp_esp,exp_data,exp_periodo in casos:
            r=analisar(txt); ok=True; erros=[]
            if r.intencao!=exp_int:
                ok=False; erros.append(f"intencao: got {r.intencao}, want {exp_int}")
            if exp_esp and r.especialidade!=exp_esp:
                ok=False; erros.append(f"esp: got {r.especialidade!r}, want {exp_esp!r}")
            if exp_esp is None and r.intencao in INTENCOES_SEM_SLOTS and r.especialidade:
                ok=False; erros.append(f"esp espúria: {r.especialidade!r}")
            if exp_data and not r.data_iso:
                ok=False; erros.append("data: não encontrou")
            if exp_periodo and (not r.periodo or not r.periodo["label"].startswith(exp_periodo)):
                ok=False; erros.append(f"periodo: got {r.periodo['label'] if r.periodo else None!r}, want {exp_periodo!r}")
            show(txt,r,ok)
            if not ok:
                for e in erros: print(f"    ⚠  {e}")
                falhas.append((txt,erros))
            total+=1; passed+=1 if ok else 0
    print(f"\n\n  {'═'*60}")
    sc=passed/total*100
    bar="█"*int(sc//5)+"░"*(20-int(sc//5))
    print(f"  RESULTADO: {passed}/{total}  [{bar}]  {sc:.0f}%")
    if falhas:
        print(f"\n  FALHAS ({len(falhas)}):")
        for txt,erros in falhas:
            print(f"    ✗ \"{txt}\"")
            for e in erros: print(f"        {e}")
    else:
        print(f"  Todos os testes passaram ✅")
    print(f"  {'═'*60}\n")

if __name__=="__main__":
    run()
