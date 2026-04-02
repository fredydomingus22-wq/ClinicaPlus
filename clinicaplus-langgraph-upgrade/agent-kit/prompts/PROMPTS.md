# PROMPTS — ClinicaPlus NLU Agent
## Prompts de Sistema + Prompts de Execução para Agente de Código
## Versão: 2.1.0 | Abril 2026

---

> **NOTA PARA O AGENTE DE CÓDIGO**
> Este ficheiro contém dois tipos de prompts:
> - **Prompts de Sistema** (PROMPT 01–05): usados em runtime pelo agente LangGraph para comunicar com o LLM
> - **Prompts de Execução** (PROMPT 06–11): usados por ti (agente de código) para implementar cada fase do upgrade
>
> Antes de qualquer execução, lê obrigatoriamente:
> - `agent-kit/CLAUDE.md` — versões, regras e arquitectura
> - `agent-kit/skills/SKILLS.md` — implementação de cada nó
> - `agent-kit/resources/RESOURCES.md` — setup de providers e requirements.txt
> - `agent-kit/references/REFERENCES.md` — URLs de verificação
> - `docs/domain/DOMAIN.md` — entidades e regras de negócio
> - `docs/module-requirements/MODULE-REQUIREMENTS.md` — RF, RNF, casos de teste

---

## ═══════════════════════════════════════════════════
## SECÇÃO A — PROMPTS DE SISTEMA (Runtime LangGraph)
## ═══════════════════════════════════════════════════

---

## PROMPT 01 — System Prompt Dinâmico por Tenant

**Usado em:** nó `tenant_loader` → injectado como `SystemMessage` no início de cada thread nova
**Ficheiro de implementação:** `app/agent/nodes/tenant_loader.py`
**Referência de skill:** `agent-kit/skills/SKILLS.md` → SKILL 01

```python
def build_system_prompt(clinic_config: dict, today_iso: str) -> str:
    """
    Constrói o system prompt com dados reais da clínica vindos da DB.
    NUNCA incluir tenant_id nem IDs internos neste prompt.
    Ver regra RN-005 em: docs/domain/DOMAIN.md
    """
    specialties = ", ".join(clinic_config.get("specialties", []))
    insurance   = clinic_config.get("accepted_insurance", "consultar recepção")
    cancel_pol  = clinic_config.get("cancellation_policy", "cancelar com 24h de antecedência")
    working_hrs = clinic_config.get("working_hours", "Seg-Sex 8h-18h, Sáb 8h-13h")

    return f"""És o assistente virtual da {clinic_config['name']}, uma clínica privada em Angola.

IDENTIDADE:
- Função: Agendamento e informações de consultas via WhatsApp
- Língua: Português angolano — simpático, directo e profissional

ESPECIALIDADES DISPONÍVEIS: {specialties}
HORÁRIO DE FUNCIONAMENTO: {working_hrs}
CONVÉNIOS ACEITES: {insurance}
POLÍTICA DE CANCELAMENTO: {cancel_pol}
DATA DE HOJE: {today_iso}

REGRAS DE COMPORTAMENTO:
1. NUNCA confirmes um agendamento sem ter: especialidade + data + hora confirmadas pelo paciente
2. Se o paciente der uma data relativa ("amanhã", "sexta"), converte para DD/MM/AAAA e confirma
3. Máximo 2 perguntas por mensagem
4. Se não souberes responder, diz que vais transferir para a equipa
5. NUNCA inventares horários ou disponibilidade — usa sempre as ferramentas disponíveis
6. Responde sempre em Português de Angola — informal mas profissional

EXEMPLOS (Few-Shot):

[Exemplo 1 — Agendamento com especialidade mencionada]
Paciente: "queria marcar uma consulta com o doutor de clínica geral pra semana que vem"
→ intent: agendar | collected: specialty=clínica geral | missing: date, time
→ Resposta: "Claro! Tenho disponibilidade em clínica geral na próxima semana. Qual dia preferes — segunda, terça ou quarta-feira?"

[Exemplo 2 — Agendamento sem slots]
Paciente: "bom dia, quero marcar uma consulta"
→ intent: agendar | collected: {{}} | missing: specialty, date, time
→ Resposta: "Bom dia! Com prazer. Que especialidade precisas? Temos: {specialties}"

[Exemplo 3 — Cancelamento]
Paciente: "posso desmarcar minha consulta de amanhã?"
→ intent: cancelar | collected: date_relative=amanhã | missing: appointment_reference
→ Resposta: "Claro, consigo ajudar. Tens o número da consulta ou o nome do médico para eu localizar?"

[Exemplo 4 — Dúvida sobre convénio]
Paciente: "vocês aceitam o seguro da ENSA?"
→ intent: duvida | Resposta: (usar clinic_config accepted_insurance)

[Exemplo 5 — Pedido de atendente]
Paciente: "quero falar com alguém"
→ intent: humano | Resposta: "Estou a transferir para a nossa equipa. Um momento! 🙏"

[Exemplo 6 — Linguagem informal angolana]
Paciente: "mano quero marcar kamba, tenho dores de cabeça"
→ intent: agendar | collected: symptom_hint=dores de cabeça
→ Resposta: "Sim, consigo ajudar! Para dores de cabeça posso marcar com clínica geral ou neurologia. Qual preferes?"
"""
```

---

## PROMPT 02 — Intent Router (JSON Estruturado)

**Usado em:** nó `intent_router`
**Ficheiro de implementação:** `app/agent/nodes/intent_router.py`
**Referência de skill:** `agent-kit/skills/SKILLS.md` → SKILL 03

```python
INTENT_ROUTER_PROMPT = """
Analisa a mensagem do paciente e retorna APENAS um objecto JSON válido.
Sem texto antes ou depois. Sem blocos markdown.

Intents possíveis:
- "agendar"   → quer marcar, reservar ou fazer uma consulta
- "cancelar"  → quer desmarcar, cancelar ou adiar uma consulta existente
- "duvida"    → pergunta sobre horários, preços, convénios, localização, especialidades
- "humano"    → quer falar com atendente, recepcionista ou pessoa real
- "saudacao"  → apenas cumprimento sem intenção específica
- "outro"     → fora do contexto de clínica médica

Formato de resposta:
{{
  "intent": "<intent>",
  "confidence": <0.0 a 1.0>,
  "extracted_slots": {{
    "specialty":    "<especialidade se mencionada, senão null>",
    "date_raw":     "<data como o paciente escreveu, senão null>",
    "time_raw":     "<hora como o paciente escreveu, senão null>",
    "doctor_name":  "<nome do médico se mencionado, senão null>",
    "symptom_hint": "<sintoma que sugere especialidade, senão null>"
  }},
  "reasoning": "<1 frase explicando a classificação>"
}}

Mensagem do paciente: {patient_message}
"""
```

---

## PROMPT 03 — Slot Collector

**Usado em:** nó `slot_collector` (loop até todos os slots recolhidos)
**Ficheiro de implementação:** `app/agent/nodes/slot_collector.py`
**Referência de skill:** `agent-kit/skills/SKILLS.md` → SKILL 04
**Regras de negócio:** `docs/domain/DOMAIN.md` → RN-001, RN-002, RN-004

```python
SLOT_COLLECTOR_PROMPT = """
Estás a recolher informação para {intent} uma consulta médica.

Estado actual:
- Slots já confirmados: {collected_slots_json}
- Próximo slot a recolher: {next_missing_slot}
- Especialidades disponíveis: {available_specialties}
- Turno actual: {turn_count} de 10 máximo

Regras:
- Faz APENAS UMA pergunta nesta mensagem
- Apresenta opções concretas sempre que possível
- Usa linguagem natural angolana — informal mas clara
- Se turn_count >= 8, sugere gentilmente falar com atendente

Guia por slot:
- specialty           → "Que especialidade precisas? Temos: {available_specialties}"
- date                → "Para que dia queres marcar? (ex: segunda dia 7)"
- time                → "Que horário preferes — manhã (8h-12h) ou tarde (14h-17h)?"
- confirmation        → "Então ficamos com: {booking_summary}. Confirmas?"
- appointment_reference → "Tens o número da consulta ou o nome do médico?"

Histórico recente:
{recent_messages}

Responde directamente ao paciente:
"""
```

---

## PROMPT 04 — FAQ Responder

**Usado em:** nó `faq_responder`
**Ficheiro de implementação:** `app/agent/nodes/faq_responder.py`
**Referência de skill:** `agent-kit/skills/SKILLS.md` → SKILL 05

```python
FAQ_RESPONDER_PROMPT = """
O paciente tem uma dúvida sobre a clínica. Responde com base nas informações abaixo.

Informações da clínica:
- Nome: {clinic_name}
- Especialidades: {specialties}
- Horário: {working_hours}
- Convénios aceites: {accepted_insurance}
- Política de cancelamento: {cancellation_policy}
- Localização: {location}

Dúvida: {patient_question}

Regras:
- Máximo 3 frases, directas e completas
- Se a informação não estiver disponível:
  "Para mais detalhes contacta a nossa recepção. Posso ajudar em mais alguma coisa?"
- Usa português angolano natural
- Não inventes nada que não esteja no contexto acima

Resposta:
"""
```

---

## PROMPT 05 — Audit Prompt (QA do Agente)

**Usado em:** pipeline de avaliação — `tests/audit/audit_runner.py`
**Casos de teste:** `docs/module-requirements/MODULE-REQUIREMENTS.md` → tabela TC-001 a TC-012

```python
AUDIT_PROMPT = """
Actuas como auditor de qualidade do assistente NLU do ClinicaPlus.

INTERACÇÃO A AUDITAR:
---
{conversation_transcript}
---

ESTADO FINAL DO AGENTE:
{agent_state_json}

CRITÉRIOS (referência: docs/module-requirements/MODULE-REQUIREMENTS.md):

1. PRECISÃO DE INTENÇÃO (0-10)
   A intent classificada corresponde ao que o paciente realmente queria?

2. COMPLETUDE DE SLOTS (0-10)
   Todos os slots necessários foram recolhidos antes de executar a acção?
   (ver SLOTS_BY_INTENT em docs/domain/DOMAIN.md)

3. TOM E LÍNGUA (0-10)
   O tom é adequado para paciente angolano? A língua é natural e clara?

4. SEGURANÇA MULTI-TENANT (pass/fail)
   Algum dado de outro tenant foi exposto?
   O tenant_id apareceu algures na conversa?
   (ver docs/adrs/ADR-003-multitenant-isolation.md)

5. EFICIÊNCIA (0-10)
   Conversa resolvida com o mínimo de turnos necessários?
   (referência: docs/module-requirements/MODULE-REQUIREMENTS.md → RNF-001)

6. COBERTURA DE CASOS DE TESTE
   Qual(is) TC da tabela MODULE-REQUIREMENTS este transcript cobre?

Responde APENAS com JSON:
{{
  "scores": {{
    "intent_precision":   <0-10>,
    "slot_completeness":  <0-10>,
    "tone_language":      <0-10>,
    "multitenant_safety": "<pass|fail>",
    "efficiency":         <0-10>
  }},
  "test_cases_covered": ["TC-001", "TC-002"],
  "issues_found":        ["<descrição do problema>"],
  "suggestions":         ["<sugestão de melhoria>"],
  "overall_rating":      "<excellent|good|needs_improvement|critical>"
}}
"""
```

---

## ═══════════════════════════════════════════════════
## SECÇÃO B — PROMPTS DE EXECUÇÃO (Para o Agente de Código)
## ═══════════════════════════════════════════════════

> Cola cada prompt directamente no Claude Code ou agente de código equivalente.
> Cada prompt é auto-suficiente: lista as referências de ficheiros, os passos exactos
> e os critérios de validação antes de avançar à fase seguinte.

---

## PROMPT 06 — Inicialização: Leitura de Contexto

**Usar PRIMEIRO — antes de qualquer outra fase.**

```
TAREFA: Inicializar contexto completo para o upgrade NLU do ClinicaPlus

Antes de escrever qualquer linha de código, lê os seguintes ficheiros nesta ordem exacta.
Para cada ficheiro, reporta os pontos críticos que encontraste.

━━━ LEITURA 1: agent-kit/CLAUDE.md ━━━
Extrai e lista:
  A) Todas as versões da tabela "VERSÕES VERIFICADAS" (pacote + versão + URL PyPI)
  B) As 7 regras da secção "REGRAS PARA O AGENTE DE CÓDIGO"
  C) Todos os campos do AgentState da secção 4 com os seus tipos Python
  D) O formato exacto do thread_id da secção 5
  E) O import exacto do AsyncPostgresSaver da secção 6

━━━ LEITURA 2: docs/domain/DOMAIN.md ━━━
Extrai e lista:
  A) O glossário completo (10 termos)
  B) As regras de negócio RN-001 a RN-007
  C) Os limites do sistema (MAX_TURNS, WHATSAPP_MAX_LENGTH, THREAD_TTL, MAX_SLOTS_PER_INTENT)
  D) Os campos das entidades Tenant, Patient, AgentThread, Appointment

━━━ LEITURA 3: docs/module-requirements/MODULE-REQUIREMENTS.md ━━━
Extrai e lista:
  A) Requisitos Funcionais RF-001 a RF-008 (1 linha por RF)
  B) Requisitos Não Funcionais RNF-001 a RNF-006 (1 linha por RNF)
  C) A tabela completa de Casos de Teste TC-001 a TC-012 (ID + cenário + expected)
  D) Estimativa de esforço total e por fase

━━━ LEITURA 4: docs/adrs/ADR-001-langgraph-adoption.md ━━━
Extrai:
  A) A decisão tomada e porquê (em 2 frases)
  B) As consequências negativas e as mitigações

━━━ LEITURA 5: docs/adrs/ADR-002-llm-provider-strategy.md ━━━
Extrai:
  A) O PROVIDER_MAP completo (provider key → modelo → custo → uso)
  B) Os alertas de mudança (modelos deprecated)
  C) A ordem de fallback

━━━ LEITURA 6: docs/adrs/ADR-003-multitenant-isolation.md ━━━
Extrai:
  A) O Checklist de Code Review completo (5 itens)
  B) As 3 estratégias de isolamento (thread_id, tool binder, filtragem DB)

━━━ LEITURA 7: agent-kit/references/REFERENCES.md ━━━
Extrai:
  A) Os URLs de PyPI para os 5 pacotes principais
  B) Os alertas de "Sinalizadores de Mudança Rápida" (tabela final)

━━━ VERIFICAÇÃO DE VERSÕES (obrigatório antes de avançar) ━━━
Para cada pacote da tabela do CLAUDE.md, verifica a versão actual no PyPI.
Se encontrares discrepância entre a versão documentada e a versão actual do PyPI, PARA e reporta.
Não avanças enquanto não houver confirmação.

━━━ RELATÓRIO FINAL DESTA FASE ━━━
Apresenta:
1. Tabela de versões verificadas (pacote | versão doc | versão PyPI | match?)
2. As 3 regras absolutas mais críticas para esta implementação
3. Os 3 requisitos funcionais que mais impactam a arquitectura
4. Quaisquer conflitos ou ambiguidades encontradas nos documentos

NÃO cries nenhum ficheiro nesta fase. Apenas lê, verifica e reporta.
Aguarda confirmação antes de avançar para o PROMPT 07.
```

---

## PROMPT 07 — Fase 1: Setup de Ambiente e Dependências

**Pré-requisito:** PROMPT 06 executado e versões confirmadas
**Referências principais desta fase:**
- `agent-kit/resources/RESOURCES.md` → secções "REQUIREMENTS.TXT" e ".env.example"
- `agent-kit/references/REFERENCES.md` → tabela LangGraph e tabela LLM Providers
- `agent-kit/CLAUDE.md` → secção "VERSÕES VERIFICADAS"

```
TAREFA: Fase 1 — Setup de ambiente e dependências verificadas

━━━ PASSO 1.1 — Verificar versões actuais no PyPI ━━━
Executa cada comando e regista o output exacto:

  pip index versions langgraph 2>/dev/null | head -1
  pip index versions langgraph-checkpoint-postgres 2>/dev/null | head -1
  pip index versions langgraph-checkpoint 2>/dev/null | head -1
  pip index versions langchain-groq 2>/dev/null | head -1
  pip index versions langchain-cerebras 2>/dev/null | head -1
  pip index versions langchain-google-genai 2>/dev/null | head -1
  pip index versions fastapi 2>/dev/null | head -1
  pip index versions psycopg 2>/dev/null | head -1

Compara cada resultado com a tabela em agent-kit/CLAUDE.md → "VERSÕES VERIFICADAS".
Se alguma versão diferir: PARA e reporta. Não instales sem confirmação.

━━━ PASSO 1.2 — Criar requirements.txt ━━━
Fonte do conteúdo base: agent-kit/resources/RESOURCES.md → "REQUIREMENTS.TXT — Versões Verificadas"
Regras de criação:
  - Usar versões exactas verificadas no passo 1.1 (não os intervalos genéricos)
  - Adicionar comentário em cada grupo de pacotes explicando para que serve
  - Adicionar linha de comentário no topo: "# Verificado em: [data de hoje]"
  - Separar em grupos: # LangGraph Core | # LangChain Core | # LLM Providers | # Database | # FastAPI | # Utils

Ficheiro a criar: requirements.txt (na raiz do projecto)

━━━ PASSO 1.3 — Criar .env.example ━━━
Fonte: agent-kit/resources/RESOURCES.md → ".env.example — Template de Variáveis"
Regras:
  - NUNCA criar .env com valores reais — apenas .env.example com placeholders
  - Adicionar comentário explicativo em cada variável indicando onde obter a chave
  - Para GROQ_API_KEY: comentar "# Obter em: console.groq.com — free, sem cartão"
  - Para GOOGLE_API_KEY: comentar "# Obter em: aistudio.google.com — free, sem cartão"
  - Para CEREBRAS_API_KEY: comentar "# Obter em: cloud.cerebras.ai — free, sem cartão"
  - Para ANTHROPIC_API_KEY: comentar "# Obter em: console.anthropic.com — PAGO"
  - Adicionar aviso: "# ATENÇÃO: Gemini 2.0 deprecated Jun 2026 — usar gemini-2.5-flash"

Ficheiro a criar: .env.example (na raiz do projecto)

━━━ PASSO 1.4 — Criar estrutura de pastas ━━━
Cria exactamente esta estrutura (sem ficheiros, só pastas + __init__.py vazios):

  app/
    __init__.py
    agent/
      __init__.py
      nodes/          ← 8 nós (implementados na Fase 3)
        __init__.py
      tools/          ← binder.py (implementado na Fase 4)
        __init__.py
      prompts/        ← builder.py com funções de prompt (Fase 3)
        __init__.py
      state.py        ← AgentState TypedDict (Fase 2)
      graph.py        ← compilação do grafo (Fase 2)
      providers.py    ← factory de LLM por tenant (Fase 4)
      checkpointer.py ← AsyncPostgresSaver setup (Fase 2)
    api/
      __init__.py
      webhooks.py     ← FastAPI webhook handler (Fase 4)
  scripts/
    setup_checkpointer.py  ← migration script — NÃO é runtime (Fase 2)
  tests/
    __init__.py
    unit/             ← testes de nós isolados (Fase 5)
      __init__.py
    integration/      ← testes de grafo completo (Fase 5)
      __init__.py
    audit/            ← audit runner (Fase 5)
      __init__.py

━━━ PASSO 1.5 — Instalar dependências ━━━
  pip install -r requirements.txt

Se houver conflitos de dependências, reporta o erro completo antes de tentar resolver.

━━━ VALIDAÇÃO DA FASE 1 ━━━
Confirma cada item antes de reportar conclusão:
  [ ] requirements.txt criado com versões verificadas e comentado por grupos
  [ ] .env.example criado com comentários de origem de cada chave
  [ ] Estrutura de pastas criada conforme especificado
  [ ] pip install sem erros de conflito (ou conflitos reportados)
  [ ] Nenhum ficheiro .env com valores reais foi criado

Reporta resultado e aguarda confirmação antes de avançar para PROMPT 08.
```

---

## PROMPT 08 — Fase 2: Estado e Compilação do Grafo

**Pré-requisito:** Fase 1 completa e confirmada
**Referências principais desta fase:**
- `agent-kit/CLAUDE.md` → secções 3, 4, 5, 6 (grafo, state, thread_id, checkpointer)
- `docs/domain/DOMAIN.md` → entidade AgentThread e Limites do Sistema
- `docs/adrs/ADR-001-langgraph-adoption.md` → justificação das escolhas
- `docs/adrs/ADR-003-multitenant-isolation.md` → estratégia thread_id

```
TAREFA: Fase 2 — Implementar AgentState, checkpointer e esqueleto do grafo

━━━ PASSO 2.1 — AgentState ━━━
Ficheiro: app/agent/state.py
Fonte exacta: agent-kit/CLAUDE.md → secção 4 "AGENTSTATE — CONTRATO DO ESTADO"
Fonte de suporte: docs/domain/DOMAIN.md → entidade AgentThread

Imports obrigatórios (não mudar):
  from typing import Annotated, TypedDict, Optional
  from langgraph.graph.message import add_messages

Campos obrigatórios (copia da secção 4 do CLAUDE.md, não omitir nenhum):
  messages: Annotated[list, add_messages]
  tenant_id: str
  whatsapp_number: str
  patient_id: Optional[str]
  patient_name: Optional[str]
  clinic_config: dict
  llm_provider: str
  intent: Optional[str]
  collected_slots: dict
  missing_slots: list[str]
  requires_human: bool
  conversation_stage: str
  turn_count: int
  last_activity_ts: str

Adiciona docstring ao ficheiro indicando:
  "Fonte: agent-kit/CLAUDE.md secção 4 | docs/domain/DOMAIN.md entidade AgentThread"

━━━ PASSO 2.2 — Checkpointer ━━━
Ficheiro: app/agent/checkpointer.py
Fonte: agent-kit/CLAUDE.md → secção 6 "CHECKPOINTER — PRODUÇÃO"

Import correcto (verificado em pypi.org/project/langgraph-checkpoint-postgres):
  from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

Regras críticas (da documentação oficial — pypi.org/project/langgraph-checkpoint-postgres):
  - Usar AsyncPostgresSaver, não PostgresSaver síncrono
  - Se usar psycopg.connect() manual: obrigatório autocommit=True e row_factory=dict_row
  - NUNCA chamar .setup() aqui — apenas em scripts/setup_checkpointer.py
  - Usar context manager (async with) para gestão do lifecycle

Cria uma função get_checkpointer() que retorna AsyncPostgresSaver configurado.
Adiciona comentário no topo: "AVISO: Chamar .setup() apenas via scripts/setup_checkpointer.py"

━━━ PASSO 2.3 — Script de Migration ━━━
Ficheiro: scripts/setup_checkpointer.py
Fonte: agent-kit/skills/SKILLS.md → SKILL 07

Adiciona no topo do ficheiro:
  """
  SCRIPT DE MIGRATION — Executar APENAS UMA VEZ na primeira deploy.
  NÃO incluir no runtime da aplicação FastAPI.
  Cria as tabelas 'checkpoints' e 'checkpoint_blobs' no PostgreSQL.

  Uso: python scripts/setup_checkpointer.py
  Referência: pypi.org/project/langgraph-checkpoint-postgres (v3.0.5)
  """

━━━ PASSO 2.4 — build_thread_id ━━━
Ficheiro: app/agent/graph.py (função auxiliar no topo)
Fonte: agent-kit/CLAUDE.md → secção 5 "THREAD ID — ESTRATÉGIA MULTI-TENANT"
Fonte de suporte: docs/adrs/ADR-003-multitenant-isolation.md

Implementação exacta:
  def build_thread_id(remote_jid: str, tenant_id: str) -> str:
      number = remote_jid.split("@")[0].strip()
      return f"{tenant_id}:{number}"

Adiciona docstring com exemplo:
  "244912345678@s.whatsapp.net" + "clinic_abc" → "clinic_abc:244912345678"

━━━ PASSO 2.5 — Esqueleto do Grafo ━━━
Ficheiro: app/agent/graph.py
Fonte: agent-kit/CLAUDE.md → secção 3 "ESTRUTURA DO GRAFO LANGGRAPH"

Cria o grafo com nós stub (funções que retornam {}):
  from langgraph.graph import StateGraph, END, START
  from app.agent.state import AgentState

  # Stubs — serão substituídos na Fase 3
  async def _stub(state: AgentState) -> dict:
      return {}

  builder = StateGraph(AgentState)
  builder.add_node("tenant_loader", _stub)
  builder.add_node("patient_identifier", _stub)
  builder.add_node("intent_router", _stub)
  builder.add_node("slot_collector", _stub)
  builder.add_node("faq_responder", _stub)
  builder.add_node("human_handoff", _stub)
  builder.add_node("action_executor", _stub)
  builder.add_node("response_formatter", _stub)
  builder.add_edge(START, "tenant_loader")
  # Edges completos serão adicionados na Fase 3

━━━ VALIDAÇÃO DA FASE 2 ━━━
Executa e confirma cada verificação:

  python -c "from app.agent.state import AgentState; print('✅ AgentState OK')"
  python -c "from app.agent.checkpointer import get_checkpointer; print('✅ Checkpointer OK')"
  python -c "from app.agent.graph import build_thread_id; print(build_thread_id('244900000001@s.whatsapp.net', 'clinic_test'))"
  # Expected: "clinic_test:244900000001"

  [ ] app/agent/state.py com todos os 14 campos da secção 4 do CLAUDE.md
  [ ] app/agent/checkpointer.py usando AsyncPostgresSaver (não síncrono)
  [ ] scripts/setup_checkpointer.py com aviso proeminente de "apenas migration"
  [ ] build_thread_id retorna formato correcto: "clinic_abc:244912345678"
  [ ] Nenhum import de psycopg2 — apenas psycopg (v3)

Reporta resultado e aguarda confirmação antes de avançar para PROMPT 09.
```

---

## PROMPT 09 — Fase 3: Implementação dos Nós

**Pré-requisito:** Fase 2 completa, grafo a compilar
**Referências principais desta fase:**
- `agent-kit/skills/SKILLS.md` → SKILL 01 ao SKILL 06 (um por nó)
- `agent-kit/prompts/PROMPTS.md` → PROMPT 01 ao PROMPT 04 (prompts de sistema)
- `docs/domain/DOMAIN.md` → SLOTS_BY_INTENT, Regras de Negócio RN-001 a RN-007
- `docs/module-requirements/MODULE-REQUIREMENTS.md` → RF-002, RF-003, RF-004, RF-005, RF-006

```
TAREFA: Fase 3 — Implementar todos os nós do grafo LangGraph

Implementa os nós na seguinte ordem (simples → complexo).
Para cada nó, consulta o SKILL correspondente em agent-kit/skills/SKILLS.md.

━━━ NÓ 1 — tenant_loader ━━━
Ficheiro: app/agent/nodes/tenant_loader.py
Skill de referência: agent-kit/skills/SKILLS.md → SKILL 01
Prompt de sistema: agent-kit/prompts/PROMPTS.md → PROMPT 01 (build_system_prompt)
  → Mover build_system_prompt para: app/agent/prompts/builder.py
Requisito coberto: RF-002 (identificação de tenant)
Regras a aplicar: RN-005 (tenant_id nunca no system prompt)

Verificações obrigatórias antes de finalizar:
  [ ] Verificar se clinic_config já existe no state antes de re-carregar DB
  [ ] SystemMessage é o PRIMEIRO elemento adicionado a state["messages"]
  [ ] tenant_id não aparece em nenhum trecho do system_prompt gerado
  [ ] last_activity_ts actualizado com datetime.now(timezone.utc).isoformat()

━━━ NÓ 2 — patient_identifier ━━━
Ficheiro: app/agent/nodes/patient_identifier.py
Skill de referência: agent-kit/skills/SKILLS.md → SKILL 02
Requisito coberto: RF-002
Regras a aplicar: RN-007 (paciente pode ter threads em múltiplas clínicas)

Verificações obrigatórias:
  [ ] Se patient_id já está no state → retornar {} imediatamente (sem DB query)
  [ ] Toda query ao DB inclui tenant_id no filtro (checklist ADR-003)
  [ ] Criação de paciente mínimo se não existir (só número + tenant)

━━━ NÓ 3 — intent_router ━━━
Ficheiro: app/agent/nodes/intent_router.py
Skill de referência: agent-kit/skills/SKILLS.md → SKILL 03
Prompt de sistema: agent-kit/prompts/PROMPTS.md → PROMPT 02 (INTENT_ROUTER_PROMPT)
Requisito coberto: RF-003
Limite a aplicar: MAX_TURNS de docs/domain/DOMAIN.md → Limites do Sistema

Verificações obrigatórias:
  [ ] Guard: se turn_count >= MAX_TURNS → retornar intent="humano" sem chamar LLM
  [ ] try/except no json.loads() → fallback para intent="duvida" se JSON inválido
  [ ] Slots extraídos são merged com collected_slots existentes (não substituem)
  [ ] Slots com valor None ou "" são filtrados do merge
  [ ] Função route_by_intent implementada para edge condicional
  [ ] turn_count incrementado em +1 neste nó
  [ ] Confidence < 0.5 → tratar como "duvida"

━━━ NÓ 4 — slot_collector ━━━
Ficheiro: app/agent/nodes/slot_collector.py
Skill de referência: agent-kit/skills/SKILLS.md → SKILL 04
Prompt de sistema: agent-kit/prompts/PROMPTS.md → PROMPT 03 (SLOT_COLLECTOR_PROMPT)
Requisito coberto: RF-004
Slots por intent: docs/domain/DOMAIN.md → "Regras de Negócio RF-004"
  agendar:  ["specialty", "date", "time", "confirmation"]
  cancelar: ["appointment_reference", "cancellation_reason", "confirmation"]

Verificações obrigatórias:
  [ ] SLOTS_BY_INTENT definido como constante no topo do ficheiro
  [ ] missing_slots calculado como [s for s in required if s not in collected ou valor vazio]
  [ ] Nó nunca pergunta slot que já está em collected_slots
  [ ] MAX_SLOTS_PER_INTENT respeitado (docs/domain/DOMAIN.md → Limites)
  [ ] Função check_slots_complete implementada para edge condicional de loop:
        se missing_slots vazio → "action_executor"
        caso contrário → "slot_collector" (loop)

━━━ NÓ 5 — faq_responder ━━━
Ficheiro: app/agent/nodes/faq_responder.py
Skill de referência: agent-kit/skills/SKILLS.md → SKILL 05 (implícito no documento)
Prompt de sistema: agent-kit/prompts/PROMPTS.md → PROMPT 04 (FAQ_RESPONDER_PROMPT)
Requisito coberto: RF-003 (fallback de dúvidas)

Verificações:
  [ ] Prompt preenchido com dados de clinic_config (não de DB externo)
  [ ] Resposta sempre < 3 frases

━━━ NÓ 6 — human_handoff ━━━
Ficheiro: app/agent/nodes/human_handoff.py
Requisito coberto: RF-006
Triggers de escalada: docs/module-requirements/MODULE-REQUIREMENTS.md → RF-006

Verificações:
  [ ] state["requires_human"] = True
  [ ] Notificação enviada para atendente (webhook de clinic_config["handoff_webhook"])
  [ ] Mensagem final ao paciente: "Estou a transferir para a nossa equipa. Um momento! 🙏"

━━━ NÓ 7 — action_executor ━━━
Ficheiro: app/agent/nodes/action_executor.py
Skill de referência: agent-kit/skills/SKILLS.md → SKILL 05
Requisito coberto: RF-005
Import obrigatório: from langgraph.prebuilt import ToolNode

Verificações:
  [ ] Tools criadas via build_tools_for_tenant (implementado na Fase 4 — criar stub por agora)
  [ ] ToolNode instanciado com as tools do tenant
  [ ] try/except envolve toda a execução → mensagem amigável em caso de falha
  [ ] tenant_id nunca aparece nos parâmetros das tools (verificar após Fase 4)

━━━ NÓ 8 — response_formatter ━━━
Ficheiro: app/agent/nodes/response_formatter.py
Skill de referência: agent-kit/skills/SKILLS.md → SKILL 06
Limite: WHATSAPP_MAX_LENGTH = 4096 (docs/domain/DOMAIN.md → Limites)

Verificações:
  [ ] Truncagem se len(resposta) > 4096
  [ ] Extrai última mensagem AI do state["messages"]
  [ ] Fallback se nenhuma mensagem AI encontrada

━━━ ACTUALIZAR GRAFO COM NÓS REAIS ━━━
Ficheiro: app/agent/graph.py
Substituir os stubs pelos imports dos nós reais.
Adicionar edges condicionais:
  builder.add_conditional_edges("intent_router", route_by_intent, {
      "slot_collector":     "slot_collector",
      "faq_responder":      "faq_responder",
      "human_handoff":      "human_handoff",
      "response_formatter": "response_formatter",
  })
  builder.add_conditional_edges("slot_collector", check_slots_complete, {
      "action_executor": "action_executor",
      "slot_collector":  "slot_collector",
  })
  builder.add_edge("faq_responder",      "response_formatter")
  builder.add_edge("action_executor",    "response_formatter")
  builder.add_edge("human_handoff",      "response_formatter")
  builder.add_edge("response_formatter", END)

━━━ VALIDAÇÃO DA FASE 3 ━━━
  python -c "from app.agent.graph import graph; nodes = graph.get_graph().nodes; print('Nós:', list(nodes.keys()))"
  # Expected: ['__start__', 'tenant_loader', 'patient_identifier', 'intent_router',
  #            'slot_collector', 'faq_responder', 'human_handoff', 'action_executor',
  #            'response_formatter']

  [ ] 8 ficheiros criados em app/agent/nodes/
  [ ] app/agent/prompts/builder.py com build_system_prompt e as 4 constantes de prompt
  [ ] Grafo compilado com 8 nós reais e edges condicionais
  [ ] Nenhum nó expõe tenant_id ao LLM em nenhum contexto

Reporta output do comando de validação e aguarda confirmação antes de avançar para PROMPT 10.
```

---

## PROMPT 10 — Fase 4: Tools, Providers e FastAPI

**Pré-requisito:** Fase 3 completa
**Referências principais desta fase:**
- `agent-kit/CLAUDE.md` → secções 7 e 8 (Tool Binder e LLM Providers)
- `agent-kit/skills/SKILLS.md` → SKILL 08 (LLM Provider Factory)
- `agent-kit/resources/RESOURCES.md` → setup de cada provider (Groq, Gemini, Cerebras)
- `docs/adrs/ADR-002-llm-provider-strategy.md` → PROVIDER_MAP, fallback, alertas
- `docs/adrs/ADR-003-multitenant-isolation.md` → Checklist de Code Review

```
TAREFA: Fase 4 — Tool Binder, Provider Factory e integração FastAPI

━━━ PASSO 4.1 — Tool Binder ━━━
Ficheiro: app/agent/tools/binder.py
Fonte: agent-kit/CLAUDE.md → secção 7 "TOOL BINDER — ISOLAMENTO MULTI-TENANT"
Regra de isolamento: docs/adrs/ADR-003-multitenant-isolation.md

Ferramentas a implementar (3 tools):
  1. get_available_slots(specialty: str, date_iso: str) → str
     Docstring: "Busca horários disponíveis para uma especialidade e data."
     [tenant_id encapsulado na closure — NÃO nos parâmetros]

  2. book_appointment(patient_id: str, doctor_id: str, datetime_iso: str) → str
     Docstring: "Agenda uma consulta para o paciente."
     [tenant_id encapsulado na closure — NÃO nos parâmetros]

  3. cancel_appointment(appointment_id: str, reason: str) → str
     Docstring: "Cancela uma consulta existente."
     [tenant_id encapsulado na closure — NÃO nos parâmetros]

Verificações obrigatórias de segurança (executar após criar o ficheiro):
  grep "tenant_id" app/agent/tools/binder.py
  → tenant_id deve aparecer APENAS dentro do corpo das funções internas
  → NUNCA nos parâmetros do @tool nem nas docstrings
  → Se aparecer nos parâmetros → CORRIGIR antes de avançar

Cada tool deve ter try/except com mensagem amigável:
  except Exception as e:
      return f"Não consegui completar a operação. Por favor contacta a recepção."

━━━ PASSO 4.2 — Provider Factory ━━━
Ficheiro: app/agent/providers.py
Fonte: agent-kit/skills/SKILLS.md → SKILL 08
Fonte de suporte: agent-kit/resources/RESOURCES.md → tabela de providers
Decisão de design: docs/adrs/ADR-002-llm-provider-strategy.md

PROVIDER_MAP a implementar (modelos verificados em Abril 2026):
  "groq"      → "llama-3.3-70b-versatile"  [free: 14.400 req/dia]
  "groq_fast" → "llama-3.1-8b-instant"     [free: alta velocidade]
  "gemini"    → "gemini-2.5-flash"          [NÃO usar 2.0 — deprecated Jun 2026]
  "cerebras"  → "gpt-oss-120b"             [free: 1M tokens/dia]
  "claude"    → "claude-sonnet-4-6"         [pago]

Fonte de verificação de modelos: agent-kit/references/REFERENCES.md → tabelas de cada provider
ALERTA CRÍTICO (documentado em ADR-002): NÃO usar gemini-2.0-flash — shutdown Junho 2026

Implementar ordem de fallback (ADR-002):
  groq → cerebras → gemini → erro explícito (não silencioso)

Usar init_chat_model do langchain para abstracção (RF-008):
  from langchain.chat_models import init_chat_model

━━━ PASSO 4.3 — FastAPI Webhook Handler ━━━
Ficheiro: app/api/webhooks.py
Requisito coberto: RF-001 (resposta HTTP 200 < 500ms, processamento async)

Estrutura do payload Evolution API (documentada em agent-kit/references/REFERENCES.md):
  data.key.remoteJid    → remote_jid (ex: "244912345678@s.whatsapp.net")
  data.instanceName     → tenant identifier (mapeia para tenant_id)
  data.message.conversation → texto da mensagem

Implementar em dois passos:
  PASSO A: Responder 200 imediatamente (antes de qualquer processamento)
  PASSO B: Lançar background task com a lógica do agente

Lógica da background task:
  1. Extrair remote_jid e message_body do payload
  2. Lookup tenant_id por instanceName (DB query)
  3. Se tenant não existe → log e return (RF-011 comportamento silencioso)
  4. Construir thread_id via build_thread_id(remote_jid, tenant_id)
  5. Construir estado inicial com os campos mínimos do AgentState
  6. Chamar await graph.ainvoke(state, config={"configurable": {"thread_id": thread_id}})
  7. Enviar resposta via Evolution API (POST para /message/sendText)

━━━ PASSO 4.4 — Rate Limiting por Tenant ━━━
Ficheiro: app/api/webhooks.py (adicionar à lógica da background task)
Usar asyncio.Semaphore para limitar concurrent requests por tenant:
  _tenant_semaphores: dict[str, asyncio.Semaphore] = {}

  def get_tenant_semaphore(tenant_id: str) -> asyncio.Semaphore:
      if tenant_id not in _tenant_semaphores:
          _tenant_semaphores[tenant_id] = asyncio.Semaphore(3)  # max 3 concurrent
      return _tenant_semaphores[tenant_id]

━━━ VALIDAÇÃO DA FASE 4 ━━━
Executar checklist de code review de docs/adrs/ADR-003-multitenant-isolation.md
para app/agent/tools/binder.py especificamente:

  grep -n "tenant_id" app/agent/tools/binder.py
  # Verificar que tenant_id só aparece em linhas do corpo interno das funções

  [ ] binder.py — tenant_id NUNCA nos parâmetros do @tool
  [ ] binder.py — tenant_id NUNCA nas docstrings das tools
  [ ] providers.py — gemini-2.0-flash NÃO usado em nenhum lugar
  [ ] providers.py — fallback chain implementado (groq → cerebras → gemini)
  [ ] webhooks.py — resposta HTTP 200 antes do processamento
  [ ] webhooks.py — processamento em background task (não blocking)
  [ ] webhooks.py — tenant inexistente: HTTP 200 silencioso + log

Reporta resultado e aguarda confirmação antes de avançar para PROMPT 11.
```

---

## PROMPT 11 — Fase 5: Testes e Auditoria

**Pré-requisito:** Fases 1–4 completas
**Referências principais desta fase:**
- `docs/module-requirements/MODULE-REQUIREMENTS.md` → tabela TC-001 a TC-012, RNF-005
- `docs/domain/DOMAIN.md` → Regras de Negócio, Limites do Sistema
- `docs/adrs/ADR-003-multitenant-isolation.md` → Checklist de Code Review
- `agent-kit/prompts/PROMPTS.md` → PROMPT 05 (Audit Prompt para QA)
- `agent-kit/CLAUDE.md` → Regra: "usar InMemorySaver nos testes, nunca AsyncPostgresSaver"

```
TAREFA: Fase 5 — Implementar suite de testes e auditoria de qualidade

REGRA ABSOLUTA DESTA FASE (de agent-kit/CLAUDE.md):
  Usar SEMPRE InMemorySaver nos testes — NUNCA AsyncPostgresSaver.
  Import correcto: from langgraph.checkpoint.memory import InMemorySaver

━━━ PASSO 5.1 — Testes Unitários dos Nós ━━━
Pasta: tests/unit/
Cobertura mínima: 3 nós prioritários (RNF-005 de MODULE-REQUIREMENTS.md)

Para cada nó, criar test_<nome>.py com estrutura:
  - test_happy_path: input válido → output esperado
  - test_edge_case: input limite ou anormal → comportamento correcto
  - test_tenant_isolation: verificar que tenant_id não vaza

FICHEIRO 1: tests/unit/test_intent_router.py
Cenários a testar (baseados em TC-001 a TC-010):
  - "quero marcar consulta" → intent="agendar", confidence > 0.5
  - "quero desmarcar" → intent="cancelar"
  - "vocês aceitam ENSA?" → intent="duvida"
  - "quero falar com alguém" → intent="humano"
  - "bom dia" → intent="saudacao"
  - Resposta LLM com JSON inválido → fallback para intent="duvida" (sem crash)
  - turn_count=10 → intent="humano" SEM chamar o LLM (guard de MAX_TURNS)

FICHEIRO 2: tests/unit/test_slot_collector.py
Cenários (baseados em RF-004 e SLOTS_BY_INTENT):
  - Todos os slots em falta → pergunta apenas o primeiro
  - Slot "specialty" já preenchido → não pergunta de novo
  - Todos os slots preenchidos → check_slots_complete retorna "action_executor"
  - Slots parcialmente preenchidos → loop continua ("slot_collector")

FICHEIRO 3: tests/unit/test_tenant_loader.py
Cenários:
  - Nova thread (sem clinic_config no state) → carrega do DB e injeta SystemMessage
  - Thread existente (clinic_config já no state) → retorna {} sem chamar DB
  - tenant_id não encontrado no DB → lança ValueError
  - SystemMessage gerada não contém o tenant_id (verificação de segurança)

━━━ PASSO 5.2 — Testes de Integração do Grafo ━━━
Pasta: tests/integration/
Referência: docs/module-requirements/MODULE-REQUIREMENTS.md → tabela de Casos de Teste

Implementar os seguintes TCs (ID da tabela → cenário exacto):

TC-001: Agendamento em 1 turno
  Input: "Quero marcar clínica geral para sexta às 10h"
  Mock: DB retorna clínica com especialidade "clínica geral" e slot disponível
  Expected: intent=agendar, all slots collected, consulta criada, 1 turno

TC-002: Agendamento parcial iterativo
  Inputs sequência: ["quero marcar", "clínica geral", "sexta dia 11", "10h", "sim"]
  Expected: consulta criada após 5 turnos, slot_collector em loop até confirmação

TC-007: Escalada por MAX_TURNS
  Input: 10 mensagens consecutivas sem completar intenção
  Expected: no turno 10, requires_human=True, human_handoff executado

TC-008: Isolamento multi-tenant (CRÍTICO — testar primeiro)
  Setup: 2 tenants — "clinic_A" e "clinic_B"
  Mesmo paciente: whatsapp_number = "244900000001"
  Cenário A: iniciar conversa com clinic_A → thread_id = "clinic_A:244900000001"
  Cenário B: iniciar conversa com clinic_B → thread_id = "clinic_B:244900000001"
  Verificar: state de clinic_A não contamina state de clinic_B
  Verificar: clinic_config de A é diferente de clinic_config de B nos estados
  Expected: PASS — threads completamente independentes

TC-009: Mesmo número, duas clínicas
  Verificar que build_thread_id gera IDs diferentes:
    build_thread_id("244900000001@s.whatsapp.net", "clinic_A") == "clinic_A:244900000001"
    build_thread_id("244900000001@s.whatsapp.net", "clinic_B") == "clinic_B:244900000001"
    assert thread_A != thread_B

TC-010: Linguagem informal angolana
  Input: "mano quero marcar kamba, tenho dores de cabeça"
  Expected: intent=agendar, symptom_hint="dores de cabeça", specialty sugerida (clínica geral ou neurologia)

TC-011: Webhook tenant inexistente
  Input: payload com instanceName não registado na DB
  Expected: função retorna sem processar, nenhum grafo invocado

━━━ PASSO 5.3 — Audit Runner ━━━
Ficheiro: tests/audit/audit_runner.py
Usa: PROMPT 05 de agent-kit/prompts/PROMPTS.md → AUDIT_PROMPT
Critério de passagem: overall_rating in ["excellent", "good"]

Implementar:
  - Para cada ficheiro de transcript em tests/audit/transcripts/
  - Chamar o LLM com AUDIT_PROMPT preenchido
  - Guardar resultado JSON em tests/audit/results/
  - Imprimir relatório consolidado com scores médios e TCs cobertos

Criar 2 transcripts de exemplo:
  - tests/audit/transcripts/tc001_agendamento_completo.json
  - tests/audit/transcripts/tc008_multitenant_isolation.json

━━━ PASSO 5.4 — Verificação de Segurança Multi-Tenant ━━━
Executa os seguintes greps e confirma os resultados esperados:

  grep -n "tenant_id" app/agent/tools/binder.py
  # ESPERADO: tenant_id só nas linhas do corpo interno (closure), nunca nos @tool params

  grep -rn "tenant_id" app/agent/nodes/
  # ESPERADO: não deve aparecer em nenhum prompt ou mensagem enviada ao LLM

  grep -n "2.0-flash\|gemini-2.0" app/agent/providers.py
  # ESPERADO: zero ocorrências (deprecated Jun 2026)

━━━ VALIDAÇÃO FINAL DA FASE 5 ━━━
Executa a suite completa:
  pytest tests/unit/ -v --tb=short
  pytest tests/integration/ -v --tb=short
  python tests/audit/audit_runner.py

Relatório final a apresentar:
  1. Tabela de TCs: ID | Status (pass/fail) | Observações
  2. Score médio do audit_runner (overall_rating)
  3. RNF-005 cumprido? (sim/não com justificação)
  4. Checklist de segurança multi-tenant: todos os greps confirmados?
  5. Quais TCs falharam e qual o plano de correcção

━━━ CRITÉRIOS DE ACEITAÇÃO DO UPGRADE COMPLETO ━━━
O upgrade só está completo quando:
  [ ] TC-001, TC-002, TC-007, TC-008, TC-009, TC-010, TC-011 passando
  [ ] TC-008 e TC-009 (isolamento) com PASS obrigatório — sem excepção
  [ ] audit_runner com overall_rating "good" ou "excellent" nos 2 transcripts
  [ ] Nenhum gemini-2.0 no código
  [ ] Nenhum tenant_id nos parâmetros de tools
  [ ] Nenhum AsyncPostgresSaver nos testes (apenas InMemorySaver)
  [ ] scripts/setup_checkpointer.py com aviso de migration
```