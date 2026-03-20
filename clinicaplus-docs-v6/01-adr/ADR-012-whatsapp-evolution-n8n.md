# ADR-012 — Módulo WhatsApp: Evolution API + n8n + Automações Geridas

**Data:** 2026-03-13
**Status:** ACEITE
**Autores:** ClinicaPlus Core Team
**Lê também:** ADR-006 (BullMQ), ADR-009 (API Keys), ADR-011 (Planos)

---

## Contexto

O ClinicaPlus precisa de permitir que clínicas recebam e confirmem agendamentos
via WhatsApp, enviem lembretes automáticos, e configurem fluxos de mensagens —
sem que o admin saia do painel ou aprenda a usar ferramentas externas.

Decisões em aberto:
1. Gateway WhatsApp: API oficial Meta vs solução não-oficial (Baileys)
2. Motor de automação: n8n self-hosted vs Zapier/Make vs código custom
3. Interface de configuração: o admin configura o n8n directamente vs painel gerido
4. Arquitectura do fluxo: n8n orquestra tudo vs ClinicaPlus API central

---

## Decisões

### 1. Gateway: Evolution API com Baileys (Fase 1) → Meta Cloud API (Fase 2)

**Fase 1:** Evolution API v2 com protocolo Baileys.
- Gratuito, self-hosted no Railway
- 1 instância por clínica (número WhatsApp dedicado)
- Risco aceite: protocolo não-oficial, possível banimento de número
- Mitigação: avisar clínicas, fazer backup de conversas, migração para Fase 2 preparada

**Fase 2 (v3):** Migração para Meta Cloud API oficial quando o volume o justificar.
- A Evolution API suporta ambos com a mesma interface REST — migração é configuração, não código.

**Descartado:** Twilio (caro para Angola), 360dialog (sem presença local), WhatsApp Business App (não tem API).

### 2. Motor de automação: n8n self-hosted (Railway)

- Workflows criados **programaticamente** pelo ClinicaPlus via n8n REST API
- O admin nunca vê nem abre o n8n — é infra interna como o Redis
- Templates de workflow pré-construídos por nós, parametrizados por clínica
- n8n MCP server disponível para diagnóstico e desenvolvimento

**Descartado:** Zapier/Make (custo por execução, sem self-host, sem API de criação de workflows), código custom (maintenance burden, duplicar o que o n8n já faz bem).

### 3. Interface: painel gerido no ClinicaPlus

O admin vê toggles simples. O sistema cria/destrói workflows no n8n automaticamente.
Cada automação tem um `n8nWorkflowId` — se desactivar, o workflow é desactivado no n8n.

### 4. Arquitectura: n8n chama ClinicaPlus API (não o contrário)

```
Paciente → WhatsApp → Evolution API → n8n webhook
n8n → processa etapa → POST /api/whatsapp/fluxo/* (ClinicaPlus)
ClinicaPlus → cria agendamento, actualiza conversa, envia resposta via Evolution API
```

O ClinicaPlus API é a fonte de verdade. O n8n é o roteador de mensagens.
Os templates n8n são stateless — estado da conversa vive no ClinicaPlus DB.

---

## Consequências

**Fica mais fácil:**
- Admin configura automações sem saber o que é n8n
- Adicionar novos tipos de automação: criar template + adicionar enum
- Migrar gateway WhatsApp: só mudar `evolutionApi.ts`, não os templates

**Fica mais difícil:**
- Debugging: falha pode ser na Evolution API, no n8n, ou no ClinicaPlus
- Deploy: 2 novos serviços Railway (Evolution API + n8n)
- Testes: precisam de mocks para Evolution API e n8n

**Trade-offs aceites:**
- Baileys tem risco de banimento de número — aceite para Fase 1
- n8n adiciona latência (~200ms) vs chamada directa — aceite (fluxo conversacional, não real-time)
- Plano PRO+ obrigatório para WhatsApp automações (ver ADR-011 feature matrix)
