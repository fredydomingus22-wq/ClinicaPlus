---
name: whatsapp
description: >
  Usa esta skill SEMPRE que tocares em qualquer ficheiro do módulo WhatsApp:
  services wa-*, lib/evolutionApi, lib/n8nApi, n8n-templates/*, routes/whatsapp,
  jobs wa-lembrete ou wa-expirar-conversas, componentes WaConexaoCard/WaAutomacaoCard/
  WhatsappPage, ou qualquer endpoint /api/whatsapp/*. Inclui TDD: testes são
  obrigatórios ANTES do código de produção.
references:
  - reference/db-schema.md
  - reference/evolution-api.md
  - reference/n8n-templates.md
  - reference/conversa-state-machine.md
  - reference/tdd-specs.md
  - reference/ui-painel.md
related_skills:
  - tdd/SKILL.md: ciclo RED→GREEN→REFACTOR — obrigatório para todos os services
  - SKILL-redis-bullmq.md: jobs de lembrete e expiração de conversas
  - SKILL-websocket.md: notificações QR, estado, actividade em tempo real
  - SKILL-rbac.md: requirePermission('whatsapp', 'manage') nas rotas de escrita
  - subscricoes/SKILL.md: requirePlan('PRO') em todas as rotas de gestão
---

## Quando usar esta skill

- Implementar `wa-instancia.service.ts`, `wa-automacao.service.ts`, `wa-conversa.service.ts`
- Implementar `wa-webhook.service.ts` (handler do webhook Evolution API)
- Criar ou editar templates n8n em `lib/n8n-templates/`
- Qualquer rota em `routes/whatsapp.ts`
- Componentes `WhatsappPage`, `WaConexaoCard`, `WaAutomacaoCard`, `WaActividadeRecente`
- Jobs `wa-lembrete.job.ts` e `wa-expirar-conversas.job.ts`

## Quando NÃO usar

- Configurar a Evolution API ou o n8n directamente (são infra — ver DEPLOYMENT.md)
- Usar o n8n MCP para inspecção (não é código — é ferramenta de desenvolvimento)
- Alterar o agendamentosService sem ser para adicionar suporte a canal=WHATSAPP

## Sub-skills disponíveis

| Ficheiro | Quando ler |
|----------|-----------|
| `reference/db-schema.md` | Antes de qualquer query ou migration relacionada com wa_* |
| `reference/evolution-api.md` | Implementar qualquer chamada à Evolution API |
| `reference/n8n-templates.md` | Criar ou alterar templates de workflow n8n |
| `reference/conversa-state-machine.md` | Implementar etapas do fluxo de conversa |
| `reference/tdd-specs.md` | Especificação completa de todos os testes (~50 casos) |
| `reference/ui-painel.md` | Implementar componentes React do painel WhatsApp |

## Regras absolutas

**CORRECTO ✅ — clinicaId da API key, nunca do body**
```typescript
router.post('/fluxo/inicio', apiKeyAuth, async (req, res) => {
  const clinicaId = req.user.clinicaId;  // extraído do middleware apiKeyAuth
  const { numero, instanceName, pushName } = req.body;
});
```

**ERRADO ❌ — IDOR: paciente pode forjar clinicaId**
```typescript
router.post('/fluxo/inicio', apiKeyAuth, async (req, res) => {
  const { clinicaId, numero, instanceName } = req.body;  // NUNCA
});
```

---

**CORRECTO ✅ — HMAC verificado antes de qualquer processamento**
```typescript
router.post('/webhook', verificarHmacEvolution, receberWebhook);
```

**ERRADO ❌ — webhook sem verificação de origem**
```typescript
router.post('/webhook', receberWebhook);  // NUNCA
```

---

**CORRECTO ✅ — número normalizado**
```typescript
const numero = data.key.remoteJid
  .replace('@s.whatsapp.net', '')
  .replace('@c.us', '');
// Guarda: "244923456789"
```

**ERRADO ❌ — JID completo na DB**
```typescript
const numero = data.key.remoteJid;  // "244923456789@s.whatsapp.net" — NUNCA
```

---

**CORRECTO ✅ — desactivação resiliente ao n8n em baixo**
```typescript
if (automacao.n8nWorkflowId) {
  await n8nApi.desactivar(automacao.n8nWorkflowId).catch(err => {
    logger.warn(`n8n desactivar falhou: ${err.message}`);
  });
}
await prisma.waAutomacao.update({ where: { id }, data: { ativo: false } });
```

**ERRADO ❌ — falha se n8n em baixo, DB não actualizada**
```typescript
await n8nApi.desactivar(automacao.n8nWorkflowId);  // sem catch
await prisma.waAutomacao.update(...);
```

---

**CORRECTO ✅ — publishEvent APÓS commit Prisma**
```typescript
const agendamento = await agendamentosService.create({ ... });
// ↑ Prisma confirmou ANTES de emitir
await publishEvent(`clinica:${clinicaId}`, 'whatsapp:marcacao', { ... });
```

**ERRADO ❌ — emitir antes de confirmar**
```typescript
await publishEvent(...);  // pode emitir mesmo se create falhar
await agendamentosService.create({ ... });
```

## Checklist antes de submeter (WhatsApp)

- [ ] HMAC verificado no route `/webhook` via `verificarHmacEvolution`
- [ ] `clinicaId` extraído de `req.user.clinicaId` (API key) nos endpoints `/fluxo/*`
- [ ] Número WhatsApp normalizado (sem `@s.whatsapp.net`) antes de persistir
- [ ] `requirePlan('PRO')` em todas as rotas de gestão (/instancias, /automacoes)
- [ ] `requirePermission('whatsapp', 'manage')` nas rotas de escrita
- [ ] `n8nApi.desactivar` com `.catch(() => {})` — nunca bloquear a desactivação
- [ ] `publishEvent` chamado APÓS commit do Prisma
- [ ] Testes TDD escritos ANTES do código (ver `reference/tdd-specs.md`)
- [ ] `pnpm test --run --filter=api -- wa-` todos verdes
- [ ] Coverage `src/services/wa-*` ≥ 85%
- [ ] `pnpm typecheck` zero erros em todos os packages

## Ver também

- `docs/11-modules/MODULE-whatsapp.md` — spec completa (schema, services, endpoints)
- `docs/01-adr/ADR-012-whatsapp-evolution-n8n.md` — decisões arquitecturais
- `docs/10-runbooks/RUNBOOK-whatsapp.md` — diagnóstico de problemas em produção

## Actualização v2 — novas references adicionadas

| Ficheiro | Quando ler |
|----------|-----------|
| `reference/planos-limites.md` | Implementar enforcement por plano, limites de instâncias, notificações de desconexão |
| `reference/ui-painel.md` | Implementar todos os componentes React: WaConexaoCard, WaAutomacaoCard, WaActividadeRecente, useWhatsapp hook |
