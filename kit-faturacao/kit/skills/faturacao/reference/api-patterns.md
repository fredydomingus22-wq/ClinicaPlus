# Referência: Padrões de API — Faturação Fiscal

## Endpoints completos (v1)

### Configuração Fiscal
| Método | Path | Auth | Body / Resposta |
|--------|------|------|----------------|
| `GET`  | `/api/clinicas/me` | requireAuth | `200 ClinicaResponse` (contém nif, razSocial, etc) |
| `PATCH`| `/api/clinicas/me` | requireAuth (ADMIN) | `ClinicaUpdateDto → 200` |

### Facturas (CRUD + Operações)
| Método | Path | Auth | Body / Query | Resposta |
|--------|------|------|-------------|---------|
| `POST` | `/api/faturas` | requireAuth | `CriarFaturaDto` | `201 FaturaResponse` |
| `GET`  | `/api/faturas` | requireAuth | `?estado=&pacienteId=&dataInicio=&dataFim=&page=&limit=` | `200 { data: FaturaResponse[], total }` |
| `GET`  | `/api/faturas/:id` | requireAuth | — | `200 FaturaDetalheResponse` |
| `PATCH`| `/api/faturas/:id/emitir` | requireAuth | — | `200 FaturaResponse` (com hash) |
| `POST` | `/api/faturas/:id/pagamentos` | requireAuth | `CriarPagamentoDto` | `201 PagamentoResponse` |
| `PATCH`| `/api/faturas/:id/anular` | requireAuth | `AnularFaturaDto` | `200 FaturaResponse` |

### Fiscal e Auditoria
| Método | Path | Auth | Query | Resposta |
|--------|------|------|-------|---------|
| `GET`  | `/api/clinica/fiscal/saft` | requireAuth (ADMIN) | `?ano=2026&mes=5` | `200 application/xml` |
| `GET`  | `/api/clinica/fiscal/audit/hash-chain` | requireAuth (ADMIN) | — | `200 { valida, totalDocumentos, ultimoHash }` |
| `POST` | `/api/clinica/fiscal/testar-conexao` | requireAuth (ADMIN) | — | `200 { sucesso, mensagem }` |

---

## Estrutura dos routers

### faturas.routes.ts

```typescript
// apps/api/src/routes/faturas.routes.ts
import { Router } from 'express'
import { faturaService } from '../services/fiscal/FaturaService'
import { CriarFaturaSchema, CriarPagamentoSchema, CriarNotaCreditoSchema } from '@clinicaplus/types'

const router = Router()

// Criar rascunho
router.post('/', validateBody(CriarFaturaSchema), async (req, res) => {
  const fatura = await faturaService.criar(req.clinica!.id, req.body, req.user!.id)
  res.status(201).json(fatura)
})

// Listar
router.get('/', async (req, res) => {
  const result = await faturaService.listar(req.clinica!.id, req.query)
  res.json(result)
})

// Detalhe
router.get('/:id', async (req, res) => {
  const fatura = await faturaService.obter(req.clinica!.id, req.params.id)
  res.json(fatura)
})

// Emitir (operação critical)
router.post('/:id/emitir', async (req, res) => {
  const fatura = await faturaService.emitir(req.clinica!.id, req.params.id, req.user!.id)
  res.json(fatura)
})

// Registar pagamento
router.post('/:id/pagamentos', validateBody(CriarPagamentoSchema), async (req, res) => {
  const pagamento = await faturaService.registarPagamento(req.clinica!.id, req.params.id, req.body, req.user!.id)
  res.status(201).json(pagamento)
})

// Nota de crédito (anulação)
router.post('/:id/nota-credito', validateBody(CriarNotaCreditoSchema), async (req, res) => {
  const nc = await faturaService.criarNotaCredito(req.clinica!.id, req.params.id, req.body, req.user!.id)
  res.status(201).json(nc)
})

// Eliminar rascunho
router.delete('/:id', async (req, res) => {
  await faturaService.eliminarRascunho(req.clinica!.id, req.params.id)
  res.json({ success: true })
})

export default router
```

## Respostas de erro standard

```json
// 400 — Transição de estado inválida
{
  "error": "Não é possível emitir uma factura no estado \"EMITIDA\"",
  "code": "INVALID_STATE_TRANSITION"
}

// 400 — Dados fiscais incompletos
{
  "error": "Configure o NIF e Razão Social antes de emitir facturas",
  "code": "FISCAL_DATA_INCOMPLETE"
}

// 403 — Documento imutável
{
  "error": "Documento fiscal emitido é imutável. Use Nota de Crédito para anulação.",
  "code": "DOCUMENT_IMMUTABLE"
}

// 422 — Fatura sem itens
{
  "error": "A factura deve ter pelo menos 1 item",
  "code": "INVOICE_NO_ITEMS"
}
```
