# Plano de Implementação — Facturação Profissional AGT 2026

Implementação do motor de facturação conforme Decreto 71/25 e especificações técnicas da AGT (Angola).

## Alterações Propostas

### 1. Database (Prisma)
#### [MODIFY] [schema.prisma](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/api/prisma/schema.prisma)
- Adicionar model `SerieFacturacao` (id, clinicaId, documentType, seriesCode, seriesYear, currentSequence).
- Adicionar campos à [Fatura](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/web/src/hooks/useFaturas.ts#20-27): `documentNo`, `estadoAGT`, `submissionUUID`, `jwsDocumentSignature`.

---

### 2. Backend Services (API)
#### [NEW] [jws.service.ts](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/api/src/modules/facturacao/jws.service.ts)
- Implementação de assinatura RS256 com `crypto`.
#### [NEW] [series.service.ts](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/api/src/modules/facturacao/series.service.ts)
- Gestão de séries AGT e numeração atómica com `SELECT FOR UPDATE`.
#### [NEW] [agt.client.ts](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/api/src/modules/facturacao/agt.client.ts)
- Cliente HTTP com Basic Auth e endpoints `/registarFactura`, `/consultarEstado`.

---

### 3. Workers & Async Background
#### [NEW] [submeter-factura.worker.ts](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/api/src/workers/submeter-factura.worker.ts)
- Worker BullMQ para submissão assíncrona à AGT.
#### [NEW] [polling-factura.worker.ts](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/api/src/workers/polling-factura.worker.ts)
- Worker para consulta de estado (`VALIDA`/`INVALIDA`) após submissão.

---

### 4. Frontend (Web)
#### [MODIFY] [FaturasPage.tsx](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/web/src/pages/financeiro/FaturasPage.tsx)
- Actualização da tabela e badges de estado para reflectir `estadoAGT` (PENDENTE, SUBMETIDA, VALIDA, etc).

## Verificação
### Testes Automatizados
- Unitários para `JwsService` (validação de hash RSA).
- Integração `SeriesService` testando concorrência (20 requests paralelos).
- Mock do worker BullMQ para validar flow de submissão.

### Manual
- Emissão de fatura de teste e verificação do QR Code gerado com logo AGT.
