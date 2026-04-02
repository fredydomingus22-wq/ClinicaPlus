# ADR-003 — Estratégia de Isolamento Multi-Tenant e Thread ID
## Architecture Decision Record | ClinicaPlus v2

**Status:** Aceite  
**Data:** Abril 2026  
**Decisores:** Domingos Cambongo (Lead Architect)  
**Módulo:** NLU Pipeline — Segurança e Isolamento de Dados

---

## Contexto

O ClinicaPlus é um SaaS multi-tenant. Uma falha de isolamento entre tenants pode resultar em:
- Um paciente da Clínica A ver/modificar dados da Clínica B
- Um agendamento cruzado entre clínicas
- Vazamento de configurações privadas entre tenants

O `tenant_id` nunca deve ser exposto ao LLM — um modelo pode ser manipulado via prompt injection para revelar ou usar IDs de outros tenants.

---

## Decisão

### 1. Thread ID composto

```python
thread_id = f"{tenant_id}:{whatsapp_number_normalizado}"
# Exemplo: "clinic_abc123:244912345678"
```

Esta chave garante que:
- Cada paciente tem uma thread separada por clínica
- Dois pacientes com o mesmo número em clínicas diferentes têm threads isoladas
- O checkpointer do LangGraph nunca mistura estados entre tenants

### 2. Tool Binder — tenant_id na closure, nunca no LLM

```python
def build_tools_for_tenant(tenant_id: str, db) -> list:
    # tenant_id está encapsulado na closure Python
    # NUNCA aparece na descrição da tool que o LLM vê
    @tool
    async def get_slots(specialty: str, date_iso: str) -> str:
        """Busca horários disponíveis."""  # sem mention de tenant_id
        return await db.get_slots(tenant_id=tenant_id, ...)  # injectado aqui
```

### 3. Filtragem obrigatória em todas as queries DB

```sql
-- CORRECTO: todo SELECT deve incluir tenant_id
SELECT * FROM appointments WHERE tenant_id = $1 AND patient_id = $2;

-- ERRADO: query sem filtro de tenant
SELECT * FROM appointments WHERE patient_id = $2;
```

---

## Consequências

- Zero possibilidade de cross-tenant data leakage via LLM
- Histórico de conversação isolado por clínica e paciente
- Auditoria possível: cada thread_id mapeia para um paciente específico de uma clínica específica
- Necessidade de disciplina em todas as queries (checklist de code review)

---

## Checklist de Code Review (Segurança Multi-Tenant)

- [ ] Toda query ao DB inclui `tenant_id` no WHERE
- [ ] Nenhuma tool expõe `tenant_id` na sua docstring ou parâmetros
- [ ] Thread ID construído com `build_thread_id(remote_jid, tenant_id)`
- [ ] System prompt não menciona `tenant_id` nem outros tenants
- [ ] Testes incluem cenário de tentativa de acesso cruzado entre tenants

---

## Fontes de Referência

- docs.langchain.com/oss/python/langgraph/add-memory (thread_id patterns)
- pypi.org/project/langgraph-checkpoint-postgres (isolamento por thread)
- OWASP Multi-Tenancy Security Checklist: owasp.org
