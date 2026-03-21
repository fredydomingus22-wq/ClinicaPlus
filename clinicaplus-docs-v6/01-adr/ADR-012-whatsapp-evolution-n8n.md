# ADR-012 — Módulo WhatsApp: Evolution API + n8n Gerido + Automações

**Data:** 2026-03-18  
**Status:** ACEITE  
**Decisores:** ClinicaPlus Core Team  
**Contexto:** Módulo de automação WhatsApp para v2.1  

---

## Contexto

As clínicas em Angola usam WhatsApp pessoal para lembretes e marcações — manual, lento, não escalável. Um paciente que liga para marcar fora do horário não é atendido. Lembretes são enviados um a um pela recepcionista.

Precisamos de automatizar:
1. Marcação de consulta via WhatsApp (paciente inicia a conversa)
2. Lembretes automáticos 24h e 2h antes
3. Confirmação/cancelamento por resposta do paciente
4. Boas-vindas a novos números

E garantir que o **admin da clínica configura tudo no painel ClinicaPlus**, sem sair para o n8n.

---

## Decisões

### D1 — Gateway WhatsApp: Evolution API v2 (Baileys) em Fase 1

**Motivo:** Angola não tem integração bancária/operadora para Meta Cloud API oficial. A Evolution API usa o protocolo Baileys (WhatsApp Web), é self-hosted, gratuita, e suportada pela comunidade.

**Risco aceite:** o protocolo Baileys não é oficial — a Meta pode revogar. Mitigação: número de conta WhatsApp Business dedicado por clínica, backup diário de conversas, arquitectura preparada para migrar para Meta Cloud API sem alterar código (apenas config).

**Fase 2 (v3):** Migration para Meta Cloud API oficial — a Evolution API suporta ambos na mesma interface REST.

### D2 — Motor de automação: n8n self-hosted (Railway)

**Motivo:** n8n tem node oficial para Evolution API, permite workflows visuais complexos, tem API REST para criação programática de workflows, e é self-hosted (sem custo por execução).

**Princípio fundamental:** O admin da clínica **nunca vê o n8n**. O ClinicaPlus cria e gere workflows n8n automaticamente via API quando o admin activa uma automação.

### D3 — Estado da conversa: ClinicaPlus DB (não no n8n)

O n8n é **stateless** — apenas roteia mensagens. Todo o estado da conversa (etapa actual, dados acumulados, histórico) vive nas tabelas `WaConversa` e `WaMensagem` do ClinicaPlus. O n8n chama o ClinicaPlus API a cada mensagem recebida.

**Vantagem:** se o n8n for reiniciado ou substituído, o estado das conversas é preservado.

### D4 — Webhook único por instância, múltiplos workflows

A Evolution API suporta apenas 1 webhook URL por instância. O workflow de marcação recebe TODAS as mensagens e filtra por estado da conversa. Os outros workflows (lembrete, confirmação) são activados pelo ClinicaPlus directamente via HTTP.

### D5 — Autenticação n8n → ClinicaPlus: API Key interna

Os endpoints `/api/whatsapp/fluxo/*` são chamados pelo n8n. Não usam JWT (o n8n não tem sessão de utilizador). Usam uma API key interna gerada automaticamente quando o admin activa a automação, com scope `WRITE_AGENDAMENTOS`.

---

## Alternativas rejeitadas

| Alternativa | Porquê não |
|-------------|-----------|
| Twilio WhatsApp | Caro, não suporta Angola directamente |
| Zapier/Make | Sem self-host, sem criação programática de fluxos, custo por execução |
| Código custom sem n8n | Maintenance burden, duplicar o que o n8n já faz |
| Meta Cloud API (agora) | Processo de onboarding Meta demora semanas, requer número verificado |

---

## Consequências

**Fica mais fácil:**
- Admin configura automações em 3 cliques sem sair do ClinicaPlus
- Adicionar novo tipo de automação = criar template TypeScript + enum
- Migrar para Meta Cloud API em v3 = mudar config, não código

**Fica mais difícil:**
- Debugging: falha pode ser na Evolution API, n8n, ou ClinicaPlus — logs distribuídos
- Deploy: 2 novos serviços Railway (Evolution API + n8n)
- Testes: precisam de mocks para ambas as APIs externas

**Plano obrigatório:** PRO (1 instância WA) ou ENTERPRISE (ilimitado)
