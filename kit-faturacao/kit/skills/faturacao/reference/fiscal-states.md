# Máquina de Estados de Facturação

A conformidade com a AGT exige um rigoroso controlo sobre o ciclo de vida dos documentos.

## Estados Suportados

| Estado | Descrição | Permite Edição? | Transição Para |
|--------|-----------|-----------------|----------------|
| `RASCUNHO` | Documento em preparação. Sem valor fiscal. | SIM | `EMITIDA`, `ELIMINADA` |
| `EMITIDA` | Documento assinado e reportado à AGT. | **NÃO** | `PAGA`, `ANULADA` (via NC) |
| `PAGA` | Liquidado totalmente. | **NÃO** | `ANULADA` (via NC) |
| `ANULADA` | Factura invalidada legalmente (gera Nota de Crédito se `EMITIDA`). | **NÃO** | --- |
| `ELIMINADA` | Rascunho descartado. | **NÃO** | --- |

## Regras de Transição

1. **RASCUNHO -> EMITIDA**:
   - Requer validação de todos os campos obrigatórios (NIF Cliente, Itens, Taxas).
   - Gera o `hash` RSA-2048 encadeado.
   - Incrementa o sequencial da série.
   - Envia para a API Real-time da AGT.

2. **Correção de Erros (Pós-Emissão)**:
   - Se uma factura `EMITIDA` tiver um erro, o software **não deve** permitir a edição.
   - O utilizador deve clicar em "Anular/Rectificar".
   - O sistema cria uma **Nota de Crédito (NC)** referenciando a factura original.
   - A factura original passa para o estado `ANULADA` (referencialmente).

3. **Cancelamento de Rascunhos**:
   - Rascunhos podem ser eliminados, mas recomenda-se manter o log de auditoria para evitar manipulação de sequenciais.
