# ClinicaPlus v2 — Segurança (Delta)

Delta em relação a `06-security/SECURITY.md` (v1).

---

## 1. API Keys — Regras Absolutas

```
NUNCA guardar o token completo — só SHA-256(token) no DB
NUNCA logar o token completo ou o header X-Api-Key em plaintext
NUNCA devolver o token em GETs — só no POST de criação (único momento)
NUNCA usar comparação de string para verificar keys
SEMPRE usar SHA-256 lookup no DB
```

### Geração

```typescript
const secret = crypto.randomBytes(32).toString('hex');      // 64 chars hex
const token  = `cp_live_${secret}`;                         // prefixo + secret
const hash   = crypto.createHash('sha256').update(token).digest('hex');
const prefixo = token.slice(0, 12);                         // cp_live_xxxx — para UI

// Guardar no DB: { prefixo, keyHash: hash }
// Devolver ao utilizador: token (uma vez, no POST response)
// Nunca mais aparece em nenhum endpoint
```

---

## 2. Webhooks — Assinatura HMAC

```typescript
// Geração da assinatura em webhook.worker.ts
const timestamp = Math.floor(Date.now() / 1000).toString();
const payload   = JSON.stringify(data);
const signature = crypto
  .createHmac('sha256', webhook.secret)
  .update(`${timestamp}.${payload}`)
  .digest('hex');

// Headers em cada entrega:
'X-ClinicaPlus-Signature': `sha256=${signature}`
'X-ClinicaPlus-Event':     evento
'X-ClinicaPlus-Delivery':  entregaId
'X-ClinicaPlus-Timestamp': timestamp

// Cliente verifica:
// 1. Verificar timestamp (rejeitar se > 300s no passado — replay attack)
// 2. Recalcular HMAC com o mesmo secret
// 3. timingSafeEqual(expected, received)
```

---

## 3. RBAC — Matriz Base por Role

| Permissão | PACIENTE | RECEP | MEDICO | ADMIN | SUPER_ADMIN |
|-----------|:--------:|:-----:|:------:|:-----:|:-----------:|
| paciente:read | próprio | ✅ | ✅ | ✅ | ✅ |
| paciente:create | ❌ | ✅ | ❌ | ✅ | ✅ |
| paciente:update | ❌ | ✅ | ❌ | ✅ | ✅ |
| paciente:delete | ❌ | ❌ | ❌ | ✅ | ✅ |
| fatura:read | própria | ✅ | ❌ | ✅ | ✅ |
| fatura:create | ❌ | ✅ | ❌ | ✅ | ✅ |
| fatura:void | ❌ | ❌ | ❌ | ✅ | ✅ |
| pagamento:create | ❌ | ✅ | ❌ | ✅ | ✅ |
| relatorio:read | ❌ | ❌ | próprios | ✅ | ✅ |
| relatorio:export | ❌ | ❌ | ❌ | ✅ | ✅ |
| apikey:manage | ❌ | ❌ | ❌ | ✅ | ✅ |
| webhook:manage | ❌ | ❌ | ❌ | ✅ | ✅ |
| utilizador:invite | ❌ | ❌ | ❌ | ✅ | ✅ |
| configuracao:update | ❌ | ❌ | ❌ | ✅ | ✅ |
| auditlog:read | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 4. Audit Trail — O Que Auditar

```
Obrigatório (auditLogService.log() nos services):
  fatura:      CREATE, EMITIR, VOID, PAGAMENTO
  pagamento:   CREATE
  apikey:      CREATE, REVOKE
  webhook:     CREATE, UPDATE, DELETE
  permissao:   GRANT, DENY, RESET
  utilizador:  CREATE, DEACTIVATE
  configuracao: UPDATE
  auth:        LOGIN, FAILED_LOGIN (com IP)

Incluir sempre:
  actorId      (userId ou "apikey:{id}")
  antes/depois (snapshot do recurso para UPDATE/DELETE)
  ip           (de req.ip)
```

---

## 5. Segurança WebSocket

```
Autenticação:  JWT no handshake — mesmo secret, mesma validação
Expiração:     token expira durante sessão → emitir 'auth:expired' → cliente reconecta
Isolamento:    room por clinicaId — nunca emitir para 'all' ou namespace global
Rate limit:    100 eventos/min por socket (io.use middleware)
```

---

## 6. Checklist Segurança v2

- [ ] Token de API key nunca guardado em plaintext (só SHA-256)
- [ ] `X-Api-Key` header scrubbed nos logs do Pino (redact: ['req.headers["x-api-key"]'])
- [ ] Assinatura HMAC em 100% das entregas de webhook
- [ ] `timingSafeEqual` na verificação de assinaturas (no cliente — documentar)
- [ ] Replay attack: rejeitar webhooks com timestamp > 5 min (documentar no MODULE)
- [ ] AuditLog activo em todas as mutações financeiras e de permissões
- [ ] Cache RBAC invalidado imediatamente ao alterar permissão
- [ ] WS room isolation verificada: clinicaId do JWT — nunca do request body
