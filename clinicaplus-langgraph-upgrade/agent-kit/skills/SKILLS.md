# SKILLS — ClinicaPlus NLU Agent
## Competências por Nó do Grafo LangGraph | Abril 2026

---

## SKILL 01 — tenant_loader

**Responsabilidade:** Carregar a configuração da clínica no início de cada thread.

```python
# app/agent/nodes/tenant_loader.py
from datetime import datetime, timezone
from langchain_core.messages import SystemMessage
from app.agent.state import AgentState
from app.agent.prompts import build_system_prompt
from app.db.repositories import ClinicRepository

async def tenant_loader(state: AgentState, db: ClinicRepository) -> dict:
    """
    Nó de entrada do grafo.
    Carrega clinic_config do DB e injeta SystemMessage no início da thread.
    
    SKILL: Este nó corre apenas uma vez por thread (porque o checkpointer
    persiste o estado). Em threads existentes, o clinic_config já está 
    no estado — verificar antes de re-carregar.
    """
    # Se já temos config (thread existente), não recarregar
    if state.get("clinic_config"):
        return {}
    
    tenant_id = state["tenant_id"]
    clinic = await db.get_clinic_config(tenant_id)
    
    if not clinic:
        raise ValueError(f"Tenant {tenant_id} não encontrado")
    
    today_iso = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    system_prompt = build_system_prompt(clinic, today_iso)
    
    return {
        "clinic_config": clinic,
        "llm_provider": clinic.get("llm_provider", "groq"),
        "conversation_stage": "triagem",
        "turn_count": 0,
        "requires_human": False,
        "collected_slots": {},
        "missing_slots": [],
        "messages": [SystemMessage(content=system_prompt)],
        "last_activity_ts": datetime.now(timezone.utc).isoformat(),
    }
```

**Checklist de validação:**
- [ ] clinic_config contém: name, specialties, working_hours, cancellation_policy
- [ ] SystemMessage é o PRIMEIRO message da lista
- [ ] tenant_id nunca é exposto no system_prompt
- [ ] last_activity_ts actualizado para gestão de TTL

---

## SKILL 02 — patient_identifier

**Responsabilidade:** Identificar o paciente pelo número WhatsApp ou registá-lo.

```python
# app/agent/nodes/patient_identifier.py
from app.agent.state import AgentState
from app.db.repositories import PatientRepository

async def patient_identifier(state: AgentState, db: PatientRepository) -> dict:
    """
    Identifica o paciente pelo whatsapp_number + tenant_id.
    Se não existir, cria registo mínimo (número + timestamp).
    
    SKILL: Isolamento crítico — query SEMPRE filtrada por tenant_id.
    """
    if state.get("patient_id"):
        return {}  # já identificado em turno anterior
    
    patient = await db.find_by_whatsapp(
        whatsapp_number=state["whatsapp_number"],
        tenant_id=state["tenant_id"]  # SEMPRE filtrar por tenant
    )
    
    if not patient:
        # Criar registo mínimo — dados completos recolhidos pelo slot_collector
        patient = await db.create_minimal(
            whatsapp_number=state["whatsapp_number"],
            tenant_id=state["tenant_id"]
        )
    
    return {
        "patient_id": patient["id"],
        "patient_name": patient.get("name"),  # pode ser None inicialmente
    }
```

---

## SKILL 03 — intent_router

**Responsabilidade:** Classificar a intenção do paciente usando o LLM.

```python
# app/agent/nodes/intent_router.py
import json
from langchain_core.messages import HumanMessage
from app.agent.state import AgentState
from app.agent.providers import get_llm_for_tenant
from app.agent.prompts import INTENT_ROUTER_PROMPT

MAX_TURNS = 10  # guard de segurança

async def intent_router(state: AgentState) -> dict:
    """
    Classifica a intenção do último input do paciente.
    
    SKILL: Usar structured output (JSON) para garantir parse determinístico.
    Implementar fallback se o LLM retornar JSON inválido.
    """
    if state["turn_count"] >= MAX_TURNS:
        return {"intent": "humano", "requires_human": True}
    
    llm = get_llm_for_tenant(state["clinic_config"])
    last_user_msg = next(
        (m.content for m in reversed(state["messages"]) 
         if hasattr(m, 'type') and m.type == 'human'),
        ""
    )
    
    prompt = INTENT_ROUTER_PROMPT.format(patient_message=last_user_msg)
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    
    try:
        parsed = json.loads(response.content)
        intent = parsed.get("intent", "outro")
        slots = parsed.get("extracted_slots", {})
        # Limpar slots vazios
        slots = {k: v for k, v in slots.items() if v}
    except (json.JSONDecodeError, AttributeError):
        intent = "duvida"  # fallback seguro
        slots = {}
    
    # Merge de slots novos com existentes
    updated_slots = {**state.get("collected_slots", {}), **slots}
    
    return {
        "intent": intent,
        "collected_slots": updated_slots,
        "turn_count": state["turn_count"] + 1,
        "last_activity_ts": datetime.now(timezone.utc).isoformat(),
    }

def route_by_intent(state: AgentState) -> str:
    """Edge condicional após intent_router."""
    intent = state.get("intent", "outro")
    if intent in ("agendar", "cancelar"):
        return "slot_collector"
    elif intent == "duvida":
        return "faq_responder"
    elif intent == "humano":
        return "human_handoff"
    elif intent == "saudacao":
        return "response_formatter"
    else:
        return "faq_responder"  # fallback
```

---

## SKILL 04 — slot_collector

**Responsabilidade:** Recolher slots em falta de forma iterativa.

```python
# app/agent/nodes/slot_collector.py

SLOTS_BY_INTENT = {
    "agendar":  ["specialty", "date", "time", "confirmation"],
    "cancelar": ["appointment_reference", "cancellation_reason", "confirmation"],
}

async def slot_collector(state: AgentState) -> dict:
    """
    SKILL: Loop inteligente — identifica qual slot falta, 
    faz uma única pergunta clara, aguarda resposta.
    
    Usa o histórico de mensagens para não repetir perguntas.
    """
    intent = state["intent"]
    required = SLOTS_BY_INTENT.get(intent, [])
    collected = state.get("collected_slots", {})
    
    missing = [s for s in required if s not in collected or not collected[s]]
    
    if not missing:
        return {"missing_slots": [], "conversation_stage": "confirmacao"}
    
    next_slot = missing[0]
    # ... gerar pergunta para next_slot via LLM
    return {
        "missing_slots": missing,
        "conversation_stage": "coleta",
    }

def check_slots_complete(state: AgentState) -> str:
    """Edge condicional: continua loop ou avança para execução."""
    if not state.get("missing_slots"):
        return "action_executor"
    return "slot_collector"  # loop
```

---

## SKILL 05 — action_executor

**Responsabilidade:** Executar a acção via Tools com tenant isolation.

```python
# app/agent/nodes/action_executor.py
from langgraph.prebuilt import ToolNode
from app.agent.tools.binder import build_tools_for_tenant

async def action_executor(state: AgentState, db) -> dict:
    """
    SKILL: Instancia tools com tenant_id encapsulado (closure).
    O LLM NUNCA vê o tenant_id — está invisível na tool signature.
    
    Usa ToolNode do langgraph.prebuilt para execução padronizada.
    Fonte: pypi.org/project/langgraph-prebuilt
    """
    tools = build_tools_for_tenant(state["tenant_id"], db)
    tool_node = ToolNode(tools)
    
    result = await tool_node.ainvoke(state)
    return {**result, "conversation_stage": "encerrado"}
```

---

## SKILL 06 — response_formatter

**Responsabilidade:** Formatar a resposta final para o protocolo WhatsApp.

```python
# app/agent/nodes/response_formatter.py

WHATSAPP_MAX_LENGTH = 4096  # limite oficial WhatsApp

async def response_formatter(state: AgentState) -> dict:
    """
    SKILL: Formatar resposta respeitando limitações do WhatsApp.
    - Sem markdown complexo (bold com * funciona, tabelas não)
    - Máximo 4096 caracteres por mensagem
    - Emojis com moderação (1-2 por mensagem)
    - Números de telefone e links devem ser texto puro
    """
    last_ai_msg = next(
        (m.content for m in reversed(state["messages"]) 
         if hasattr(m, 'type') and m.type == 'ai'),
        "Ocorreu um erro. Por favor tenta novamente."
    )
    
    # Truncar se necessário
    if len(last_ai_msg) > WHATSAPP_MAX_LENGTH:
        last_ai_msg = last_ai_msg[:4090] + "..."
    
    return {"formatted_response": last_ai_msg}
```

---

## SKILL 07 — Checkpointer Setup (Migration Script)

**IMPORTANTE:** Executar APENAS uma vez na primeira deploy ou em migrations.

```python
# scripts/setup_checkpointer.py
"""
Script de migration para criar tabelas do checkpointer.
NÃO incluir no runtime da aplicação.
Fonte: pypi.org/project/langgraph-checkpoint-postgres (v3.0.5)
"""
import asyncio
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

DATABASE_URL = "postgresql://user:pass@localhost:5432/clinicaplus"

async def setup():
    async with AsyncPostgresSaver.from_conn_string(DATABASE_URL) as cp:
        await cp.setup()
        print("✅ Tabelas de checkpoint criadas com sucesso")

if __name__ == "__main__":
    asyncio.run(setup())
```

---

## SKILL 08 — LLM Provider Factory

**Compatibilidade verificada com LangChain `init_chat_model` (Abril 2026).**

```python
# app/agent/providers.py
import os
from langchain.chat_models import init_chat_model

def get_llm_for_tenant(clinic_config: dict):
    """
    Factory provider-agnostic.
    Suporta: groq, gemini, cerebras, claude
    
    Versões verificadas (Abril 2026):
    - Groq: llama-3.3-70b-versatile (recomendado qualidade)
    - Groq: llama-3.1-8b-instant (recomendado velocidade/custo)
    - Gemini: gemini-2.5-flash (free tier disponível, mais lento)
    - Cerebras: gpt-oss-120b (1M tokens/dia free, ultra-rápido)
    - Claude: claude-sonnet-4-6 (melhor qualidade, custo por token)
    
    Fontes:
    - Groq: pypi.org/project/langchain-groq
    - Gemini: ai.google.dev/gemini-api/docs/pricing (deprecação 2.0 em Jun 2026!)
    - Cerebras: inference-docs.cerebras.ai/integrations/langchain
    - Claude: docs.anthropic.com
    """
    provider = clinic_config.get("llm_provider", "groq")
    
    config = {
        "groq": {
            "model": "llama-3.3-70b-versatile",
            "model_provider": "groq",
        },
        "groq_fast": {
            "model": "llama-3.1-8b-instant", 
            "model_provider": "groq",
        },
        "gemini": {
            "model": "gemini-2.5-flash",  # ATENÇÃO: 2.0 deprecated Jun 2026
            "model_provider": "google_genai",
        },
        "cerebras": {
            "model": "gpt-oss-120b",
            "model_provider": "cerebras",
        },
        "claude": {
            "model": "claude-sonnet-4-6",
            "model_provider": "anthropic",
        },
    }
    
    cfg = config.get(provider, config["groq"])
    return init_chat_model(**cfg)
```
