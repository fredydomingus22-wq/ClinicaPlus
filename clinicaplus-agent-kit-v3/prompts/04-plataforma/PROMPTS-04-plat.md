# Sprint 5 — Plataforma (API Keys + Webhooks)

**Skill:** `SKILL-plataforma.md` + `docs/11-modules/MODULE-plataforma.md`

---

## Prompt 5.1 — API Keys

```
Lê SKILL-plataforma.md (secção API Keys — Regras Absolutas).
Lê docs/07-api/API_REFERENCE_v2.md (secção API KEYS).

1. Adiciona ao schema.prisma os models ApiKey, Webhook, WebhookEntrega da migration_002
   (PlanoLimite já existe do Sprint 4)
   pnpm db:migrate → nome: "add_platform_module"

2. Cria apps/api/src/services/apikeys.service.ts:
   create(data, clinicaId, criadoPor):
     - canUseFeature('apiKey') → AppError 402 se BASICO
     - verificar maxApiKeys não excedido (contar keys activas)
     - gerar token: cp_live_ + 64 chars hex
     - hash SHA-256 do token
     - prisma.apiKey.create({ prefixo, keyHash, ... })
     - auditLogService.log(CREATE)
     - DEVOLVER: { ...apiKeyDTO, token } (token NUNCA guardado, devolvido uma vez)
   
   revoke(id, clinicaId, criadoPor):
     - update ativo=false
     - auditLogService.log(REVOKE)
   
   list(clinicaId): retorna sem keyHash (nunca expor o hash)

3. Cria apps/api/src/middleware/apiKeyAuth.ts (ver BACKEND_v2.md secção 6):
   - SHA-256 do header X-Api-Key → lookup por keyHash no DB
   - Rate limit por key em Redis (sliding window)
   - Populate req.user e req.clinica (igual ao JWT middleware)

4. Cria apps/api/src/routes/api-keys.ts com os endpoints de API_REFERENCE_v2.md

5. Regista o router: app.use('/api/api-keys', authenticate, tenantMiddleware, apiKeysRouter)

6. Cria rota pública: app.use('/api/public/v1', apiKeyAuth, publicV1Router)
   com endpoints de API_REFERENCE_v2.md (pacientes e agendamentos read-only por agora)

7. Adiciona redact ao Pino logger: ['req.headers["x-api-key"]']

8. Cria pages/admin/IntegracoesPage.tsx (tab API Keys):
   - Lista de keys: nome, prefixo, escopos, último uso, botão Revogar
   - Modal "Nova API Key": nome + escopos (checkboxes)
   - GeneratedTokenAlert: token visível UMA VEZ (ver FRONTEND_v2.md secção 8)

Testa:
   POST /api/api-keys → response inclui token
   GET /api/public/v1/pacientes com X-Api-Key → 200
   GET /api/public/v1/pacientes sem key → 401
   GET /api/public/v1/pacientes com key revogada → 401
```

---

## Prompt 5.2 — Webhooks + Worker de Entrega

```
Lê SKILL-plataforma.md (secção Webhook Delivery).
Lê docs/06-security/SECURITY_v2.md (secção 2 — HMAC).

1. Cria apps/api/src/services/webhooks.service.ts:
   create(), update(), delete(), list()
   
   trigger(evento, payload, clinicaId):
     - buscar webhooks activos WHERE clinicaId AND eventos @> [evento]
     - para cada: criar WebhookEntrega no DB + enfileirar WebhookJob no BullMQ
       jobId: `webhook-${entrega.id}`
       attempts: 5, backoff: exponential 60s

2. Implementa apps/worker/src/workers/webhook.worker.ts:
   - Buscar webhook e entrega no DB
   - Gerar assinatura HMAC (ver SECURITY_v2.md secção 2)
   - fetch() para URL com timeout 10s
   - Gravar statusHttp e resposta (primeiros 500 chars) na WebhookEntrega
   - Se sucesso: marcar sucesso=true, concluidoEm=now()
   - Se falha: lançar erro → BullMQ faz retry automático

3. Adiciona trigger() nos services existentes:
   agendamentosService → trigger 'agendamento.criado', 'agendamento.confirmado', 'agendamento.cancelado', 'agendamento.concluido'
   faturasService → trigger 'fatura.emitida', 'fatura.paga'
   Sempre DEPOIS do commit no DB, em try/catch (falha não reverte mutação)

4. Adiciona routes em api-keys.ts ou novo webhooks.ts com endpoints de API_REFERENCE_v2.md
   Incluindo: POST /webhooks/:id/testar e POST entregas/:id/reenviar

5. Adiciona tab Webhooks em IntegracoesPage.tsx:
   - Lista de webhooks com: nome, URL, eventos, último status
   - Modal novo webhook: URL + checkboxes de eventos
   - Histórico de entregas (últimas 10) com statusHttp e sucesso/falha

Testa:
   POST /api/webhooks com URL de webhook.site
   Criar agendamento → verificar em webhook.site que entrega chegou com assinatura correcta
   Verificar GET /api/webhooks/:id/entregas → sucesso=true

Checkpoint Sprint 5:
   - [ ] API key: token mostrado UMA VEZ na UI
   - [ ] Request com X-Api-Key → 200 para endpoints com scope correcto
   - [ ] Webhook entregue em < 2s após criar agendamento
   - [ ] Assinatura HMAC válida nas entregas
   - [ ] Clínica BASICO → 402 ao tentar criar API key
   - [ ] pnpm test --run zero falhas
```

---

