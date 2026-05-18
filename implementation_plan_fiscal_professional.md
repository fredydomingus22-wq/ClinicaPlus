# [OVERHAUL] Módulo de Facturação Profissional (AGT 2026)

Este plano detalha a reestruturação completa do sistema de facturação para garantir conformidade máxima com o Decreto 71/25 e os requisitos de certificação da AGT.

## Proposed Changes

### [Component] Backend (API/Services)
#### [MODIFY] [faturas.service.ts](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/api/src/services/faturas.service.ts)
- **Refactoring do Fluxo de Emissão**: Implementar a máquina de estados rigorosa (`RASCUNHO` -> `EMITIDA`).
- **Data Snapshots**: Gravar NIF, Razão Social e Morada da clínica no documento no momento da emissão para histórico imutável.
- **Hash Chaining**: Implementar a busca robusta do hash anterior por série/tipo para garantir que a cadeia nunca quebre.

#### [NEW] [SaftService.ts](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/api/src/services/fiscal/SaftService.ts)
- Gerador de XML SAF-T AO completo com suporte para MasterFiles e SourceDocuments.

#### [MODIFY] [AgtApiClient.ts](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/api/src/services/fiscal/AgtApiClient.ts)
- Suporte para múltiplas credenciais e roteamento para o ambiente de testes da AGT (Sandbox).

### [Component] Frontend (Web/UI)
#### [NEW] [FiscalCompliancePage.tsx](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/web/src/pages/admin/FiscalCompliancePage.tsx)
- Painel profissional para gestão de:
  - Séries de Facturação (Comunicação de séries).
  - Certificados e Chaves RSA.
  - Monitor de submissão AGT (Sucesso/Erro com requestID).
  - Exportação SAF-T mensal.

#### [MODIFY] [FaturaDetalhe.tsx](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/web/src/pages/financeiro/FaturaDetalhe.tsx)
- Bloqueio total de edição para facturas emitidas.
- Botão "Rectificar/Anular" que inicia o fluxo de Nota de Crédito.

### [Component] Testing Environment
#### [NEW] [compliance.test.ts](file:///c:/Users/LENOVO/Documents/Projectos/ClinicaPlus/apps/api/src/__tests__/compliance.test.ts)
- Suite de testes que valida:
  - Integridade da cadeia de Hash.
  - Imutabilidade de facturas emitidas.
  - Estrutura XML do SAF-T gerado.

## Verification Plan

### Automated Tests
- Executar `pnpm test:compliance` no BE.
- Validar as assinaturas JWS geradas usando uma ferramenta externa de verificação RSA.

### Manual Verification
- Emitir uma factura e tentar editá-la via API (deve falhar).
- Exportar o SAF-T e passar no validador oficial da AGT (offline).
