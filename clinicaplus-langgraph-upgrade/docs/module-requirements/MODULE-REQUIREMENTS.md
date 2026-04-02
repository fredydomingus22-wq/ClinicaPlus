# MODULE REQUIREMENTS — NLU WhatsApp Pipeline
## ClinicaPlus v2 | Abril 2026

---

## Requisitos Funcionais

### RF-001: Recepção de Mensagens WhatsApp
- O sistema deve receber eventos `messages.upsert` da Evolution API via HTTP POST em `/webhook`
- O webhook deve responder com HTTP 200 em menos de 500ms (antes de processar)
- O processamento do agente deve acontecer de forma assíncrona (background task)

### RF-002: Identificação de Tenant
- O sistema deve identificar o tenant a partir do campo `instanceName` do payload Evolution API
- Se o tenant não existir na DB, o webhook deve ser ignorado (HTTP 200 silencioso)

### RF-003: Classificação de Intenção
- O agente deve classificar a mensagem em: `agendar`, `cancelar`, `duvida`, `humano`, `saudacao`, `outro`
- A classificação deve incluir um score de confiança (0.0–1.0)
- Intenções com confiança < 0.5 devem ser tratadas como `duvida`

### RF-004: Coleta de Slots
- Para intent `agendar`: recolher especialidade, data, hora, confirmação
- Para intent `cancelar`: recolher referência da consulta, motivo (opcional), confirmação
- O agente deve fazer no máximo 2 perguntas por mensagem
- Slots já fornecidos não devem ser pedidos novamente

### RF-005: Execução de Acções
- `agendar`: criar registo em `appointments` com status `scheduled`
- `cancelar`: actualizar status para `cancelled`, registar motivo e timestamp
- `consultar_disponibilidade`: retornar slots disponíveis formatados para WhatsApp

### RF-006: Escalada para Humano
- Triggers de escalada: intent `humano`, `turn_count >= 10`, tool failure, paciente pede explicitamente
- Ao escalar: notificar atendente (webhook configurável por tenant), marcar thread como escalada

### RF-007: Persistência de Conversação
- O estado da conversa deve persistir entre mensagens do mesmo paciente na mesma clínica
- A thread deve ser retomada correctamente após ≥24h de inactividade (dentro do TTL)
- Threads inactivas por mais de 4h devem ser marcadas como expiradas

### RF-008: Suporte Multi-Provider LLM
- O sistema deve suportar: Groq, Gemini, Cerebras, Claude
- O provider é configurado por tenant na tabela `clinics`
- A troca de provider não deve requerer redeploy

---

## Requisitos Não Funcionais

### RNF-001: Performance
- Latência P50 de resposta ao paciente: < 3 segundos
- Latência P99: < 8 segundos
- O uso de Groq (700+ tok/s) é o mecanismo principal de controlo de latência

### RNF-002: Segurança e Isolamento
- Zero cross-tenant data leakage (ver ADR-003)
- `tenant_id` nunca exposto ao LLM
- Toda query DB filtrada por `tenant_id`
- Tool signatures não revelam informação sobre outros tenants

### RNF-003: Disponibilidade
- O webhook FastAPI deve ter SLA de 99.5%
- Falhas do LLM provider devem ser tratadas com retry exponencial (max 3 tentativas)
- Fallback de provider configurável (ex: Groq → Cerebras se rate limit atingido)

### RNF-004: Observabilidade
- Integração com LangSmith para tracing de grafo (opcional, recomendado)
- Log estruturado de cada webhook recebido: `tenant_id`, `thread_id`, `intent`, `latency_ms`
- Alertas para turn_count >= 8 (aproximando do limite de escalada)

### RNF-005: Testabilidade
- Todo nó do grafo deve ser testável de forma isolada com `InMemorySaver`
- Mocks de DB devem ser injectáveis (dependency injection via FastAPI)
- Suite de testes de integração com pelo menos 10 cenários de conversação completos

### RNF-006: Manutenibilidade
- Sistema prompt da clínica editável na DB (sem deploy)
- Slots e regras de negócio configuráveis por tenant
- Documentação de cada nó no respectivo ficheiro (ver SKILLS.md)

---

## Casos de Teste Requeridos

| ID | Cenário | Expected |
|----|---------|---------|
| TC-001 | Agendamento completo (todos os slots fornecidos de uma vez) | Consulta criada em 1 turno |
| TC-002 | Agendamento parcial (slots em falta) | 3-4 turnos, consulta criada |
| TC-003 | Cancelamento com consulta válida | Consulta cancelada, confirmação enviada |
| TC-004 | Cancelamento < 24h | Mensagem de política, sem cancelar |
| TC-005 | Dúvida sobre convénio | Resposta com info do clinic_config |
| TC-006 | Pedido de atendente humano | Escalada imediata, notificação enviada |
| TC-007 | 10 turnos sem completar intenção | Escalada automática no turno 10 |
| TC-008 | Dois pacientes simultâneos na mesma clínica | Threads isoladas, sem interferência |
| TC-009 | Mesmo número em duas clínicas diferentes | Threads isoladas por tenant_id |
| TC-010 | Mensagem em linguagem informal angolana | Intent correctamente classificada |
| TC-011 | Webhook de tenant inexistente | HTTP 200 silencioso, sem processamento |
| TC-012 | LLM provider em rate limit | Retry com fallback provider |

---

## Dependências Externas

| Dependência | Versão | Criticidade | Fallback |
|-------------|--------|-------------|---------|
| LangGraph | 1.1.2 | Crítica | N/A |
| PostgreSQL | 15+ | Crítica | N/A |
| Evolution API | v2 | Crítica | Manual via recepção |
| Groq API | free tier | Alta | Cerebras |
| Cerebras API | free tier | Média | Gemini |
| LangSmith | opcional | Baixa | Logs locais |

---

## Estimativa de Esforço de Implementação

| Fase | Componentes | Estimativa |
|------|-------------|-----------|
| Fase 1: Setup | requirements, env, estrutura | 2h |
| Fase 2: Estado e Grafo | AgentState, graph.py, edges | 4h |
| Fase 3: Nós | 8 nós do grafo | 8h |
| Fase 4: Tools e Providers | binder, factory, providers | 4h |
| Fase 5: FastAPI Integration | webhook, handler, rate limit | 3h |
| Fase 6: Testes | 12 casos de teste | 6h |
| **Total** | | **~27h** |
