# ADR-001 — Adopção do LangGraph como Framework de Orquestração NLU
## Architecture Decision Record | ClinicaPlus v2

**Status:** Aceite  
**Data:** Abril 2026  
**Decisores:** Domingos Cambongo (Lead Architect)  
**Módulo:** Pipeline NLU WhatsApp  

---

## Contexto

O ClinicaPlus v2 necessita de um pipeline de NLU para processar mensagens WhatsApp de pacientes, interpretar intenções e executar acções no sistema (agendamento, cancelamento, consulta). O sistema é multi-tenant — cada clínica tem as suas configurações, regras e dados isolados.

A versão anterior usava n8n como orquestrador de workflows, com limitações significativas:
- Sem state management nativo entre mensagens
- Difícil manutenção de contexto de conversação multi-turno
- Sem suporte a lógica condicional complexa por tenant
- Impossibilidade de trocar o modelo de IA sem refazer fluxos

---

## Decisão

Adoptar **LangGraph 1.1.2** como framework de orquestração do pipeline NLU, com os seguintes componentes:
- `AsyncPostgresSaver` para persistência de estado (checkpointing)
- `ToolNode` do `langgraph-prebuilt` para execução de ferramentas
- `init_chat_model` do LangChain para abstracção de provider

---

## Alternativas Consideradas

### Opção A: LangGraph (escolhida)
**Prós:**
- Grafos com ciclos (suporta loops de coleta de slots nativamente)
- Checkpointing nativo via PostgreSQL — isolamento por `thread_id`
- Provider-agnostic via LangChain `init_chat_model`
- Human-in-the-loop nativo (`interrupt`)
- Observabilidade via LangSmith
- Maturidade: versão 1.1.2, usado em produção por empresas enterprise

**Contras:**
- Curva de aprendizagem mais alta que n8n
- Requer Python e infraestrutura própria

### Opção B: CrewAI
**Prós:** API simples para multi-agent  
**Contras:** Menos controlo sobre fluxo de execução; sem checkpointing nativo por thread; menos adequado para conversações multi-turno sequenciais

### Opção C: n8n (versão actual)
**Prós:** Visual, baixo código, fácil de modificar fluxos  
**Contras:** Sem state management entre mensagens; difícil manter contexto de conversa; acoplado a interface visual; difícil de testar unitariamente

### Opção D: LlamaIndex Workflows
**Prós:** Boa integração com RAG  
**Contras:** Menos maduro para conversações stateful; menos documentação sobre multi-tenant patterns

---

## Consequências

### Positivas
- Conversations stateful — o agente não "esquece" entre mensagens
- Isolamento multi-tenant garantido pelo `thread_id = tenant_id:whatsapp_number`
- Troca de LLM por tenant sem alterar código do grafo
- Testes unitários limpos com `InMemorySaver`
- Possibilidade futura de Human-in-the-loop para casos complexos

### Negativas / Riscos
- Complexidade operacional: requer gestão de tabelas de checkpoint no PostgreSQL
- Necessidade de chamar `.setup()` em migration (risco se chamado em runtime)
- Maior overhead de código comparado a n8n visual

### Mitigações
- Script de migration separado (`scripts/setup_checkpointer.py`)
- TTL de threads implementado via `last_activity_ts` (expirar após 4h inactivas)
- Documentação completa no `CLAUDE.md`

---

## Fontes de Referência

- github.com/langchain-ai/langgraph/releases (versão 1.1.2 confirmada)
- pypi.org/project/langgraph-checkpoint-postgres (v3.0.5)
- docs.langchain.com/oss/python/langgraph/add-memory
