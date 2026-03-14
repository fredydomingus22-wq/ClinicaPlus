# ClinicaPlus v2 — API Reference (Delta)

Apenas endpoints novos. Todos os endpoints v1 continuam inalterados.
Base URL: `https://api.clinicaplus.ao/api`

---

## FATURAS

### POST /faturas
**Role:** ADMIN, RECEPCIONISTA

```json
// Request
{
  "pacienteId": "cuid",
  "agendamentoId": "cuid",   // opcional
  "medicoId": "cuid",        // opcional
  "tipo": "PARTICULAR",
  "desconto": 0,
  "notas": "string",
  "itens": [
    { "descricao": "Consulta de Cardiologia", "quantidade": 1, "precoUnit": 5000, "desconto": 0 }
  ]
}

// Response 201
{ "success": true, "data": { "id": "cuid", "numeroFatura": "F-2026-00042", "estado": "RASCUNHO", "subtotal": 5000, "total": 5000, "itens": [...] } }
```

### GET /faturas
```
Query: estado, pacienteId, medicoId, dataInicio, dataFim, tipo, page, limit
```

### GET /faturas/:id
### PATCH /faturas/:id/emitir — RASCUNHO → EMITIDA
### PATCH /faturas/:id/anular — → ANULADA
```json
{ "motivo": "string obrigatório" }
```

### POST /faturas/:id/pagamentos
```json
{
  "metodo": "DINHEIRO",
  "valor": 5000,
  "referencia": "TRF-001",
  // Se metodo === "SEGURO":
  "seguro": { "seguradora": "ENSA", "numeroBeneficiario": "ENS-12345" }
}
```

### GET /faturas/:id/pagamentos
### PATCH /pagamentos/:id/seguro — actualizar estado do reembolso
```json
{ "estado": "APROVADO", "valorAprovado": 4500, "numeroAutorizacao": "AUTH-789" }
```

---

## RELATÓRIOS

### GET /relatorios/receita
**Role:** ADMIN | **Plano:** PRO (histórico), BASICO (só mês corrente)

```
Query: dataInicio (obr.), dataFim (obr.), medicoId, tipo, agruparPor (dia|semana|mes)

Response 200:
{
  "data": {
    "totais": { "receita": 450000, "consultas": 89, "mediaPorConsulta": 5056, "segurosPendentes": 25000 },
    "porMedico": [{ "medicoId": "cuid", "nome": "Dr. Carlos", "consultas": 45, "receita": 225000 }],
    "serie": [{ "data": "2026-01-01", "receita": 15000, "consultas": 3 }]
  }
}
```

### GET /relatorios/receita/export
**Plano:** PRO, ENTERPRISE → `Content-Type: text/csv` (download directo)

---

## AUDIT LOGS

### GET /audit-logs
**Role:** ADMIN, SUPER_ADMIN

```
Query: actorId, recurso, recursoId, accao, dataInicio, dataFim, page, limit

Response 200:
{
  "data": {
    "items": [{ "id": "cuid", "actorId": "cuid", "accao": "UPDATE", "recurso": "fatura", "recursoId": "cuid", "antes": {...}, "depois": {...}, "criadoEm": "..." }],
    "total": 1240, "page": 1, "limit": 50
  }
}
```

---

## API KEYS

### GET /api-keys — **Role:** ADMIN | **Plano:** PRO, ENTERPRISE
### POST /api-keys

```json
// Request
{ "nome": "Integração HIS", "escopos": ["READ_PACIENTES", "WRITE_AGENDAMENTOS"], "expiresAt": null }

// Response 201 — TOKEN APENAS AQUI. NUNCA MAIS.
{ "success": true, "data": { "id": "cuid", "nome": "...", "prefixo": "cp_live_xxxx", "token": "cp_live_<64chars>", "escopos": [...] } }
```

### DELETE /api-keys/:id — revogar

---

## WEBHOOKS

### GET /webhooks — **Role:** ADMIN | **Plano:** PRO, ENTERPRISE
### POST /webhooks
```json
{ "nome": "Notificar HIS", "url": "https://his.hospital.ao/webhook", "eventos": ["agendamento.criado", "fatura.emitida"] }
```
### PATCH /webhooks/:id
### DELETE /webhooks/:id
### POST /webhooks/:id/testar — envia evento de teste e devolve resposta
### GET /webhooks/:id/entregas — histórico das últimas 50 entregas
### POST /webhooks/:id/entregas/:entregaId/reenviar

---

## PERMISSÕES

### GET /utilizadores/:id/permissoes — **Role:** ADMIN
```json
{
  "data": {
    "base": { "fatura:void": false, "paciente:delete": true },
    "overrides": { "fatura:void": { "tipo": "GRANT" } },
    "efectivas": { "fatura:void": true, "paciente:delete": true }
  }
}
```

### PUT /utilizadores/:id/permissoes/:codigo
```json
{ "tipo": "GRANT" }   // GRANT | DENY | RESET
```

---

## API PÚBLICA v1

Base URL: `https://api.clinicaplus.ao/api/public/v1`
Auth: `X-Api-Key: cp_live_...` | **Plano:** PRO, ENTERPRISE

### GET /public/v1/pacientes — scope: READ_PACIENTES
### POST /public/v1/pacientes — scope: WRITE_PACIENTES
### GET /public/v1/agendamentos — scope: READ_AGENDAMENTOS
### POST /public/v1/agendamentos — scope: WRITE_AGENDAMENTOS
### GET /public/v1/receitas — scope: READ_RECEITAS

---

## Novos Códigos de Erro v2

| Código | Status | Quando |
|--------|--------|--------|
| `API_KEY_REQUIRED` | 401 | Header X-Api-Key em falta |
| `INVALID_API_KEY` | 401 | Key inválida ou inactiva |
| `API_KEY_EXPIRED` | 401 | Key expirada |
| `INSUFFICIENT_SCOPE` | 403 | Key sem scope necessário |
| `PLAN_LIMIT_REACHED` | 402 | Limite do plano atingido |
| `FEATURE_NOT_AVAILABLE` | 402 | Feature não disponível no plano |
| `INVOICE_VOIDED` | 409 | Operação em fatura anulada |
| `INVALID_STATE` | 409 | Transição de estado inválida |
