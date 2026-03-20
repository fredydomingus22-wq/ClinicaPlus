# Módulo Plataforma — Especificação

---

## 1. API Keys

**Formato:** `cp_live_<64 chars hex>` (total ~73 chars)

**Geração segura:**
```typescript
const secret = crypto.randomBytes(32).toString('hex'); // 64 chars
const token  = `cp_live_${secret}`;
const hash   = crypto.createHash('sha256').update(token).digest('hex');
// Guardar: { prefixo: token.slice(0, 12), keyHash: hash }
// Devolver: token (UMA VEZ, no POST de criação)
```

**Scopes disponíveis:**
```
READ_PACIENTES, WRITE_PACIENTES
READ_AGENDAMENTOS, WRITE_AGENDAMENTOS
READ_RECEITAS, READ_FATURAS, WRITE_FATURAS
```

**Rate limits por plano:**
```
PRO:        500 req/hora por key
ENTERPRISE: 5.000 req/hora por key
```

---

## 2. Webhooks — Eventos Disponíveis

```
agendamento.criado       quando agendamento é criado
agendamento.confirmado   quando estado → CONFIRMADO
agendamento.cancelado    quando agendamento é cancelado
agendamento.concluido    quando consulta é concluída
paciente.criado          quando novo paciente é registado
fatura.emitida           quando fatura → EMITIDA
fatura.paga              quando fatura → PAGA
seguro.atualizado        quando estado do reembolso muda
```

**Payload canónico:**
```json
{
  "id": "evt_<cuid>",
  "evento": "agendamento.criado",
  "clinicaId": "cuid",
  "timestamp": "2026-01-15T10:32:00Z",
  "data": { ... }
}
```

**Headers de entrega:**
```
X-ClinicaPlus-Signature:  sha256=<hmac-sha256 de timestamp.payload>
X-ClinicaPlus-Event:      agendamento.criado
X-ClinicaPlus-Delivery:   <entregaId>
X-ClinicaPlus-Timestamp:  <unix timestamp>
```

**Verificação pelo cliente (código de exemplo):**
```typescript
const timestamp = req.headers['x-clinicaplus-timestamp'];
const signature = req.headers['x-clinicaplus-signature'];
const body      = req.rawBody; // antes de parsear JSON

// 1. Rejeitar se timestamp > 5 minutos no passado (replay attack)
if (Math.abs(Date.now()/1000 - Number(timestamp)) > 300) throw new Error('Replay');

// 2. Recalcular HMAC
const expected = `sha256=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest('hex')}`;

// 3. Comparar com timing-safe equal
if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw new Error('Invalid signature');
```

---

## 3. Plan Enforcement — Limites

| Recurso | BASICO | PRO | ENTERPRISE |
|---------|:------:|:---:|:----------:|
| Médicos activos | 2 | 10 | ilimitado |
| Consultas/mês | 100 | ilimitado | ilimitado |
| Pacientes | 500 | ilimitado | ilimitado |
| API Keys | ❌ | ✅ (max 3) | ✅ |
| Webhooks | ❌ | ✅ (max 5) | ✅ |
| Relatório histórico | ❌ | ✅ | ✅ |
| Export CSV | ❌ | ✅ | ✅ |

**Período de graça ao activar enforcement:** 30 dias para clínicas BASICO que já excedam os limites (não bloquear imediatamente — mostrar aviso).

---

