---
name: subscricoes
description: >
  Usa esta skill ao tocar em qualquer código relacionado com planos, billing,
  limites de funcionalidades, estado de subscrição, upgrades/downgrades, grace period,
  enforcement de plano em rotas ou UI, ou jobs de expiração. Inclui o componente
  PlanGate, o middleware requirePlan, o serviço subscricaoService e os jobs BullMQ.
references:
  - reference/ciclo-de-vida.md
  - reference/enforcement.md
  - reference/jobs-expiracao.md
related_skills:
  - SKILL-rbac: permissões e plano enforcement operam em camadas distintas — lê ambas
  - SKILL-redis-bullmq: os jobs de expiração usam BullMQ — lê para padrões de scheduling
  - SKILL-financeiro: invoices de subscrição usam o mesmo módulo financeiro
---

## Quando usar esta skill

- Criar ou editar o `subscricaoService`
- Implementar o middleware `requirePlan()`
- Implementar o componente `<PlanGate>`
- Criar ou editar jobs de expiração/renovação
- Qualquer endpoint que verifique `clinica.plano` ou `clinica.subscricaoEstado`
- Queries que filtram por plano ou estado de subscrição
- UI de gestão de subscrição (painel admin da clínica ou super admin)

## Quando NÃO usar

- Para enforcement de permissões por role → usa SKILL-rbac
- Para criação de invoices de cobrança → usa SKILL-financeiro
- Para notificações por email → usa SKILL-redis-bullmq (fila de emails)

## Sub-skills disponíveis

| Ficheiro | Quando ler |
|----------|-----------|
| `reference/ciclo-de-vida.md` | Implementar transições de estado, o serviço, ou seeds |
| `reference/enforcement.md` | Implementar requirePlan(), PlanGate, ou verificarLimite() |
| `reference/jobs-expiracao.md` | Implementar ou depurar jobs BullMQ de expiração |

## Regras absolutas

**CORRECTO ✅**
```typescript
// Subscrição é imutável — criar novo registo, nunca editar
await subscricaoService.criarNovaSubscricao({ ... });
```

**ERRADO ❌**
```typescript
// NUNCA — destrói o histórico de auditoria
await prisma.subscricao.update({ where: { id }, data: { plano: 'PRO' } });
```

---

**CORRECTO ✅**
```typescript
// Sempre em transacção — cache e registo actualizados atomicamente
return prisma.$transaction(async (tx) => {
  await tx.subscricao.create({ ... });
  await tx.clinica.update({ data: { plano, subscricaoEstado } });
});
```

**ERRADO ❌**
```typescript
// NUNCA — race condition entre subscricao e clinica.plano
await prisma.subscricao.create({ ... });
await prisma.clinica.update({ ... }); // pode falhar → cache desincronizado
```

---

**CORRECTO ✅**
```typescript
// requirePlan verifica estado SUSPENSA para bloquear escrita
if (estado === 'SUSPENSA' && req.method !== 'GET') throw new AppError(...);
```

**ERRADO ❌**
```typescript
// NUNCA bloquear GET em conta suspensa — admin deve poder ler os seus dados
if (estado === 'SUSPENSA') throw new AppError(...);
```

---

**CORRECTO ✅**
```typescript
// -1 significa ilimitado — verificar SEMPRE antes de comparar
const limite = limites.maxMedicos;
if (limite !== -1 && actual >= limite) throw new AppError(...);
```

**ERRADO ❌**
```typescript
// -1 vai sempre falhar a comparação sem esta verificação
if (actual >= limites.maxMedicos) throw new AppError(...);
```

## Checklist antes de submeter

- [ ] Mudanças de plano criam novo registo `Subscricao` (não editam o existente)
- [ ] `clinica.plano` e `clinica.subscricaoEstado` actualizados em `$transaction`
- [ ] `verificarLimite()` trata `-1` como ilimitado
- [ ] `requirePlan()` trata `SUSPENSA` com leitura permitida, escrita bloqueada
- [ ] `PlanGate` mostra `UpgradeBanner` com o plano necessário explícito
- [ ] Jobs de expiração têm timezone `Africa/Luanda` no scheduler
- [ ] Auditoria registada em toda mudança de plano

## Ver também

- `docs/11-modules/MODULE-subscricoes.md` — documentação completa do módulo
- `docs/01-adr/ADR-011-billing-subscricoes.md` — decisão arquitectural
- `docs/10-runbooks/RUNBOOK-subscricoes.md` — diagnóstico de problemas
