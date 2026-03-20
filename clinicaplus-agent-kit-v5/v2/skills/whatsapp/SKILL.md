---
name: whatsapp
description: >
  Usa esta skill ao tocar em qualquer código do módulo WhatsApp: instâncias
  Evolution API, automações n8n, webhook handler, máquina de estados de conversa,
  templates de workflow, jobs de expiração, ou UI do painel de automações.
  Inclui padrões TDD específicos para testar código que depende de Evolution API e n8n.
references:
  - reference/evolution-api-patterns.md
  - reference/n8n-workflow-templates.md
  - reference/conversa-state-machine.md
  - reference/tdd-whatsapp.md
  - reference/ui-automacoes.md
related_skills:
  - SKILL-tdd: ciclo TDD obrigatório — lê antes de implementar qualquer service
  - SKILL-redis-bullmq: jobs de lembrete e expiração usam BullMQ
  - SKILL-websocket: notificações em tempo real (QR code, estado, actividade)
  - SKILL-rbac: requirePermission('whatsapp', 'manage') nas rotas
  - kit/skills/subscricoes/SKILL.md: requirePlan('PRO') obrigatório
---

## Quando usar esta skill

- Implementar ou alterar `wa-instancia.service.ts`, `wa-automacao.service.ts`,
  `wa-conversa.service.ts`, `wa-webhook.service.ts`
- Criar ou editar templates n8n em `lib/n8n-templates/`
- Qualquer rota em `routes/whatsapp.ts`
- Componentes `WaConexaoCard`, `WaAutomacaoCard`, `WhatsappPage`
- Jobs `wa-expirar-conversas` e `wa-lembrete-*`

## Quando NÃO usar

- Configurar o n8n ou Evolution API directamente (são infra — ver deployment docs)
- Testar ou debugar workflows n8n directamente (usar n8n MCP server)

## Sub-skills disponíveis

| Ficheiro | Quando ler |
|----------|-----------|
| `reference/evolution-api-patterns.md` | Implementar qualquer chamada à Evolution API |
| `reference/n8n-workflow-templates.md` | Criar ou alterar templates de workflow n8n |
| `reference/conversa-state-machine.md` | Implementar etapas do fluxo de conversa |
| `reference/tdd-whatsapp.md` | Especificação completa de testes por service |
| `reference/ui-automacoes.md` | Implementar componentes React do painel WA |

## Regras absolutas

**CORRECTO ✅**
```typescript
// clinicaId extraído da API key — nunca do body
router.post('/fluxo/inicio', apiKeyAuth, async (req, res) => {
  const clinicaId = req.user.clinicaId;  // vem do middleware apiKeyAuth
  const { numero, instanceName } = req.body;
  // ...
});
```

**ERRADO ❌**
```typescript
// NUNCA — IDOR: paciente pode forjar clinicaId
router.post('/fluxo/inicio', apiKeyAuth, async (req, res) => {
  const { clinicaId, numero, instanceName } = req.body;
});
```

---

**CORRECTO ✅**
```typescript
// Verificar HMAC antes de qualquer processamento do webhook
router.post('/webhook', verificarHmacEvolution, receberWebhook);
```

**ERRADO ❌**
```typescript
// NUNCA processar webhook sem verificar origem
router.post('/webhook', receberWebhook);
```

---

**CORRECTO ✅**
```typescript
// Normalizar número WhatsApp antes de guardar
const numero = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
// Guardar como "244923456789" — sem prefixo de protocolo
```

**ERRADO ❌**
```typescript
// NUNCA guardar o JID completo na DB
const numero = data.key.remoteJid;  // "244923456789@s.whatsapp.net"
```

---

**CORRECTO ✅**
```typescript
// Desactivação robusta — não bloquear se n8n estiver em baixo
if (automacao.n8nWorkflowId) {
  await n8nApi.desactivar(automacao.n8nWorkflowId).catch(() => {});
}
await prisma.waAutomacao.update({ where: { id }, data: { ativo: false } });
```

**ERRADO ❌**
```typescript
// Deixar a desactivação falhar se n8n estiver em baixo
await n8nApi.desactivar(automacao.n8nWorkflowId);  // sem catch
```

## Checklist antes de submeter

- [ ] HMAC verificado no webhook handler
- [ ] `clinicaId` extraído da API key (não do body) nos endpoints `/fluxo/*`
- [ ] Número WhatsApp normalizado (sem `@s.whatsapp.net`) antes de guardar
- [ ] `requirePlan('PRO')` em todas as rotas de gestão da instância e automações
- [ ] `requirePermission('whatsapp', 'manage')` nas rotas de escrita
- [ ] Desactivação de workflow n8n com `.catch(() => {})` — não bloquear
- [ ] Testes escritos antes do código (TDD — ver SKILL-tdd)
- [ ] Mocks de `evolutionApi` e `n8nApi` em todos os unit tests
- [ ] `pnpm test --run --filter=api` a verde

## Ver também

- `docs/11-modules/MODULE-whatsapp.md` — documentação completa
- `docs/01-adr/ADR-012-whatsapp-evolution-n8n.md` — decisões arquitecturais
- `docs/10-runbooks/RUNBOOK-whatsapp.md` — diagnóstico de problemas
