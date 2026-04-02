# DOMAIN — Modelo de Domínio do Módulo NLU WhatsApp
## ClinicaPlus v2 | Abril 2026

---

## Glossário de Domínio

| Termo | Definição |
|-------|-----------|
| **Tenant** | Uma clínica privada cliente do ClinicaPlus SaaS |
| **Paciente** | Utilizador final que interage via WhatsApp |
| **Thread** | Sessão de conversação entre paciente e agente, identificada por `tenant_id:whatsapp_number` |
| **Intent** | Classificação da intenção do paciente: `agendar`, `cancelar`, `duvida`, `humano` |
| **Slot** | Dado específico necessário para completar uma intenção (ex: especialidade, data, hora) |
| **Clinic Config** | Configuração da clínica: especialidades, horários, convénios, política de cancelamento |
| **Provider** | Motor de IA usado pelo agente: Groq, Gemini, Cerebras, Claude |
| **Checkpoint** | Snapshot do estado do agente persistido no PostgreSQL a cada superstep |
| **Tool** | Função Python que o agente pode chamar para interagir com a DB (sempre filtrada por tenant_id) |
| **Human Handoff** | Transferência da conversa para um atendente humano |

---

## Entidades do Domínio

### Tenant (Clínica)
```
Tenant
├── id: UUID (PK)
├── name: string
├── specialties: string[]
├── working_hours: string
├── cancellation_policy: string
├── accepted_insurance: string[]
├── llm_provider: enum (groq|gemini|cerebras|claude)
├── whatsapp_instance: string (Evolution API instance name)
└── active: boolean
```

### Patient (Paciente)
```
Patient
├── id: UUID (PK)
├── tenant_id: UUID (FK → Tenant) — ISOLAMENTO
├── whatsapp_number: string (normalizado, sem @s.whatsapp.net)
├── name: string (nullable — recolhido ao longo da conversa)
├── created_at: timestamp
└── last_interaction: timestamp
```

### AgentThread (Estado da Conversa)
```
AgentThread (gerido pelo LangGraph Checkpointer)
├── thread_id: string (= "{tenant_id}:{whatsapp_number}")
├── checkpoint_id: UUID
├── state: AgentState (JSON)
│   ├── messages: Message[]
│   ├── tenant_id: string
│   ├── patient_id: string
│   ├── clinic_config: ClinicConfig
│   ├── intent: Intent
│   ├── collected_slots: SlotMap
│   ├── missing_slots: string[]
│   ├── conversation_stage: Stage
│   ├── turn_count: int
│   └── last_activity_ts: ISO timestamp
└── created_at: timestamp
```

### Appointment (Consulta)
```
Appointment
├── id: UUID (PK)
├── tenant_id: UUID (FK → Tenant) — ISOLAMENTO
├── patient_id: UUID (FK → Patient)
├── doctor_id: UUID (FK → Doctor)
├── specialty: string
├── datetime_start: timestamp
├── datetime_end: timestamp
├── status: enum (scheduled|confirmed|cancelled|completed)
├── booked_via: enum (whatsapp_agent|web|phone)
└── created_at: timestamp
```

---

## Fluxos de Domínio

### Fluxo Principal: Agendamento
```
1. Paciente envia mensagem WhatsApp
2. Evolution API → FastAPI /webhook
3. FastAPI extrai: remote_jid, tenant_id, message_body
4. Constrói thread_id = f"{tenant_id}:{remote_jid}"
5. LangGraph ainvoke com thread_id e mensagem
6. tenant_loader: carrega clinic_config (se nova thread)
7. patient_identifier: identifica/cria paciente
8. intent_router: classifica → "agendar"
9. slot_collector: pede especialidade, data, hora (loop até completo)
10. action_executor: chama tool book_appointment (com tenant_id na closure)
11. response_formatter: "✅ Consulta marcada para Sexta, 11 de Abril às 10h com Dr. Silva"
12. FastAPI envia resposta via Evolution API
```

### Fluxo: Cancelamento
```
1-8. Igual ao acima
9. intent_router: classifica → "cancelar"
10. slot_collector: pede referência da consulta
11. action_executor: chama tool cancel_appointment
12. response_formatter: "✅ Consulta cancelada. Até à próxima!"
```

### Fluxo: Escalada para Humano
```
1-7. Igual
8. intent_router: "humano" OU turn_count >= MAX_TURNS
9. human_handoff: marca conversa como escalada
10. Notificação para atendente (webhook/email/WhatsApp)
11. Mensagem ao paciente: "Transferindo para atendente..."
```

---

## Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| RN-001 | Agendamento nunca confirmado sem: especialidade + data + hora |
| RN-002 | Cancelamento apenas com ≥24h de antecedência (configurável por tenant) |
| RN-003 | Máximo 10 turnos por intenção — escalada automática ao atingir limite |
| RN-004 | Thread expira após 4h de inactividade (TTL gerido por job agendado) |
| RN-005 | tenant_id nunca exposto ao LLM em nenhum contexto |
| RN-006 | Toda query ao DB filtrada por tenant_id (sem excepções) |
| RN-007 | Um paciente pode ter threads activas em múltiplas clínicas simultaneamente |

---

## Limites do Sistema

| Parâmetro | Valor | Motivo |
|-----------|-------|--------|
| MAX_TURNS por intenção | 10 | Evitar loops infinitos no grafo |
| MAX_MESSAGE_LENGTH (WhatsApp) | 4096 chars | Limite oficial WhatsApp Business API |
| THREAD_TTL | 4 horas | Balancear UX vs custo de storage |
| MAX_SLOTS_PER_INTENT | 4 | Evitar conversas excessivamente longas |
