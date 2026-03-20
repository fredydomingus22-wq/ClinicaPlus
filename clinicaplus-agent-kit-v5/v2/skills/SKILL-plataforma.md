# SKILL: Plataforma (API Keys + Webhooks + Plans)

Lê antes de API keys, webhooks, plan enforcement, ou endpoints /public/v1/.
Referência: `docs/11-modules/MODULE-plataforma.md`

---

## API Keys — Regras Absolutas

```
NUNCA guardar o token completo — só SHA-256(token)
NUNCA logar o header X-Api-Key
NUNCA devolver o token em GETs — só no POST de criação
NUNCA comparar tokens em string — sempre hash lookup
```

```typescript
// Geração:
const token = `cp_live_${crypto.randomBytes(32).toString('hex')}`;
const hash  = crypto.createHash('sha256').update(token).digest('hex');
// DB: guardar hash. Response: devolver token (uma vez).
```

## Webhook Delivery

```typescript
// SEMPRE via BullMQ — nunca fetch() síncrono
await webhookQueue.add('deliver',
  { webhookId: wh.id, entregaId: entrega.id, tentativa: 1 },
  { jobId: `webhook-${entrega.id}`, attempts: 5, backoff: { type: 'exponential', delay: 60_000 } }
);
```

## Plan Enforcement

```typescript
// Chamar ANTES de criar o recurso, NUNCA depois
await planEnforcementService.check(clinicaId, 'medicos');
// → AppError 402 'PLAN_LIMIT_REACHED' se exceder
const medico = await prisma.medico.create({ ... }); // só chega aqui se dentro do limite
```

## Checklist

- [ ] Token mostrado UMA VEZ na UI com aviso e botão de copiar
- [ ] `X-Api-Key` header no redact list do Pino logger
- [ ] Webhook secret encriptado no DB (não plaintext)
- [ ] HMAC assinatura em 100% das entregas
- [ ] Período de graça de 30 dias ao activar enforcement para clínicas existentes

---

