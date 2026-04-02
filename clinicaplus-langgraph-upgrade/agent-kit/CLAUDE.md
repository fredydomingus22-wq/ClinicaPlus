# CLAUDE.md — ClinicaPlus LangGraph Agent Kit
## Brain do Projeto para Agente de Código

**Versão:** 2.0.0  
**Data:** Abril 2026  
**Módulo:** NLU Pipeline WhatsApp — LangGraph Multi-Agent  
**Stack verificada em:** Abril 2026 contra PyPI e documentação oficial

---

## 1. CONTEXTO DO PROJECTO

ClinicaPlus é um SaaS multi-tenant para clínicas privadas angolanas. Este módulo é responsável pelo pipeline de NLU (Natural Language Understanding) que processa mensagens WhatsApp, interpreta a intenção do paciente e executa acções no sistema (agendamento, cancelamento, consulta de disponibilidade).

### Arquitectura v2 (Actual)
```
Evolution API (WhatsApp) 
    → FastAPI /webhook (receptor directo, substitui n8n)
    → LangGraph Multi-Agent Pipeline
    → PostgreSQL (checkpoints + dados clínica)
    → Resposta WhatsApp via Evolution API
```

### Princípio Core
O agente é **provider-agnostic**: suporta troca entre Claude, GPT, Gemini, Groq e Cerebras via `init_chat_model()` do LangChain, configurável por tenant.

---

## 2. VERSÕES VERIFICADAS (Abril 2026)

| Pacote | Versão | Fonte |
|--------|--------|-------|
| `langgraph` | 1.1.2 | github.com/langchain-ai/langgraph/releases |
| `langgraph-checkpoint-postgres` | 3.0.5 | pypi.org/project/langgraph-checkpoint-postgres |
| `langgraph-checkpoint` | 4.0.1 | pypi.org/project/langgraph-checkpoint |
| `langgraph-cli` | 0.4.19 | pypi.org/project/langgraph-cli |
| `langchain-core` | último estável | pypi.org/user/langchain (Mar 2026) |
| `langchain-groq` | último estável | pypi.org/project/langchain-groq |
| `langchain-google-genai` | último estável | pypi.org/project/langchain-google-genai |
| `langchain-cerebras` | 0.7.0 | pypi.org/project/langchain-cerebras |
| `fastapi` | 0.115.x | pypi.org/project/fastapi |
| `psycopg[binary]` | 3.x | pypi.org/project/psycopg |

**REGRA PARA AGENTE:** Antes de escrever qualquer código, verificar versão actual em PyPI. Nunca assumir versões do training data.

---

## 3. ESTRUTURA DO GRAFO LANGGRAPH

```
[START]
  ↓
[tenant_loader]        — carrega config da clínica do DB
  ↓
[patient_identifier]   — identifica ou regista o paciente
  ↓
[intent_router]        — classifica: agendar|cancelar|duvida|humano
  ↓ (condicional)
┌──────────────────────────────────────────┐
│ agendar/cancelar → [slot_collector]      │
│                    ↕ loop até completo   │
│                    → [action_executor]   │
│                                          │
│ duvida           → [faq_responder]       │
│                                          │
│ humano           → [human_handoff]       │
└──────────────────────────────────────────┘
  ↓
[response_formatter]   — formata para WhatsApp
  ↓
[END]
```

---

## 4. AGENTSTATE — CONTRATO DO ESTADO

```python
from typing import Annotated, TypedDict, Optional
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    # Core obrigatório
    messages: Annotated[list, add_messages]
    tenant_id: str
    whatsapp_number: str            # remoteJid normalizado
    
    # Identificação do paciente
    patient_id: Optional[str]       # None se ainda não identificado
    patient_name: Optional[str]
    
    # Contexto da clínica (injectado pelo tenant_loader)
    clinic_config: dict             # nome, especialidades, horários, regras
    llm_provider: str               # "groq"|"gemini"|"claude"|"cerebras"
    
    # Intenção e slots
    intent: Optional[str]           # "agendar"|"cancelar"|"duvida"|"humano"
    collected_slots: dict           # slots já extraídos
    missing_slots: list[str]        # slots em falta
    
    # Controlo de fluxo
    requires_human: bool
    conversation_stage: str         # "triagem"|"coleta"|"confirmacao"|"encerrado"
    turn_count: int                 # contador de turnos (evita loops infinitos)
    last_activity_ts: str           # ISO timestamp para TTL da thread
```

---

## 5. THREAD ID — ESTRATÉGIA MULTI-TENANT

```python
def build_thread_id(remote_jid: str, tenant_id: str) -> str:
    """
    Gera thread_id único e isolado por paciente e clínica.
    remote_jid: "244912345678@s.whatsapp.net"
    """
    number = remote_jid.split("@")[0].strip()
    return f"{tenant_id}:{number}"

# Uso no invoke:
config = {"configurable": {"thread_id": build_thread_id(remote_jid, tenant_id)}}
result = await graph.ainvoke(state, config=config)
```

---

## 6. CHECKPOINTER — PRODUÇÃO

```python
# CORRECTO (Produção) — AsyncPostgresSaver com psycopg3
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

async with AsyncPostgresSaver.from_conn_string(DATABASE_URL) as checkpointer:
    await checkpointer.setup()  # só na primeira execução / migration
    graph = builder.compile(checkpointer=checkpointer)

# IMPORTANTE (da documentação oficial):
# - autocommit=True é OBRIGATÓRIO se usar psycopg.connect() manual
# - row_factory=dict_row é OBRIGATÓRIO para acesso por nome de coluna
# - Chamar .setup() apenas em migration, não no runtime normal
# Fonte: pypi.org/project/langgraph-checkpoint-postgres
```

---

## 7. TOOL BINDER — ISOLAMENTO MULTI-TENANT

```python
# NUNCA expor tenant_id ao LLM. Encapsular na closure.
def build_tools_for_tenant(tenant_id: str, db_session) -> list:
    @tool
    async def get_available_slots(specialty: str, date_iso: str) -> str:
        """Busca horários disponíveis. Parâmetros: specialty (str), date_iso (YYYY-MM-DD)."""
        return await db_session.get_slots(tenant_id=tenant_id, ...)
    
    @tool  
    async def book_appointment(patient_id: str, doctor_id: str, datetime_iso: str) -> str:
        """Agenda consulta. Parâmetros: patient_id, doctor_id, datetime_iso (ISO 8601)."""
        return await db_session.create_appointment(tenant_id=tenant_id, ...)
    
    @tool
    async def cancel_appointment(appointment_id: str, reason: str) -> str:
        """Cancela consulta. Parâmetros: appointment_id, reason."""
        return await db_session.cancel_appointment(tenant_id=tenant_id, ...)
    
    return [get_available_slots, book_appointment, cancel_appointment]
```

---

## 8. LLM PROVIDERS — CONFIGURAÇÃO POR TENANT

```python
from langchain.chat_models import init_chat_model

PROVIDER_MAP = {
    "groq":     {"model": "llama-3.3-70b-versatile",  "api_key_env": "GROQ_API_KEY"},
    "groq_fast":{"model": "llama-3.1-8b-instant",     "api_key_env": "GROQ_API_KEY"},
    "gemini":   {"model": "gemini-2.5-flash",          "api_key_env": "GOOGLE_API_KEY"},
    "cerebras": {"model": "gpt-oss-120b",              "api_key_env": "CEREBRAS_API_KEY"},
    "claude":   {"model": "claude-sonnet-4-6",         "api_key_env": "ANTHROPIC_API_KEY"},
}

def get_llm_for_tenant(clinic_config: dict):
    provider = clinic_config.get("llm_provider", "groq")
    cfg = PROVIDER_MAP[provider]
    return init_chat_model(
        model=cfg["model"],
        api_key=os.getenv(cfg["api_key_env"])
    )
```

---

## 9. REGRAS PARA O AGENTE DE CÓDIGO

1. **Versões:** Sempre verificar PyPI antes de usar um pacote. Nunca assumir versões do training.
2. **Async:** Todo o grafo deve ser async (`ainvoke`, `AsyncPostgresSaver`).
3. **Tenant isolation:** O `tenant_id` NUNCA deve passar pelo contexto do LLM.
4. **Loop guard:** Verificar `turn_count >= MAX_TURNS` (max: 10) antes de cada nó colector.
5. **setup():** Chamar `checkpointer.setup()` apenas em scripts de migration, não no runtime.
6. **Error handling:** Todo tool call deve ter try/except com fallback para mensagem amigável.
7. **Testes:** Usar `InMemorySaver` nos testes unitários, nunca `AsyncPostgresSaver`.
